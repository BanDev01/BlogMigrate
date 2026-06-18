import mongoose from "mongoose";
import User from "../src/lib/models/User";
import Post from "../src/lib/models/Post";
import Tag from "../src/lib/models/Tag";
import prisma from "../src/lib/prisma";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/blogmigrate";

let failures = 0;

function check(label: string, ok: boolean, detail?: string) {
  const status = ok ? "✓" : "✗";
  console.log(`${status} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function validate() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB\n");

  console.log("--- Comparaison des counts ---");

  const mongoUserCount = await User.countDocuments();
  const pgUserCount = await prisma.user.count();
  check("users", mongoUserCount === pgUserCount, `Mongo=${mongoUserCount} Postgres=${pgUserCount}`);

  const mongoTagCount = await Tag.countDocuments();
  const pgTagCount = await prisma.tag.count();
  check("tags", mongoTagCount === pgTagCount, `Mongo=${mongoTagCount} Postgres=${pgTagCount}`);

  const mongoPostCount = await Post.countDocuments();
  const pgPostCount = await prisma.post.count();
  check("posts", mongoPostCount === pgPostCount, `Mongo=${mongoPostCount} Postgres=${pgPostCount}`);

  const mongoPosts = await Post.find().lean();
  const mongoCommentCount = mongoPosts.reduce((sum, p) => sum + p.comments.length, 0);
  const pgCommentCount = await prisma.comment.count();
  check("comments", mongoCommentCount === pgCommentCount, `Mongo=${mongoCommentCount} Postgres=${pgCommentCount}`);

  console.log("\n--- Intégrité référentielle (Postgres) ---");

  const [{ count: orphanComments }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM comments c
    LEFT JOIN posts p ON p.id = c."postId"
    WHERE p.id IS NULL
  `;
  check("0 commentaire orphelin (sans post)", Number(orphanComments) === 0, `trouvés=${orphanComments}`);

  const [{ count: orphanCommentAuthors }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM comments c
    LEFT JOIN users u ON u.id = c."authorId"
    WHERE u.id IS NULL
  `;
  check("0 commentaire sans auteur", Number(orphanCommentAuthors) === 0, `trouvés=${orphanCommentAuthors}`);

  const [{ count: postsWithoutAuthor }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM posts p
    LEFT JOIN users u ON u.id = p."authorId"
    WHERE u.id IS NULL
  `;
  check("0 post sans auteur", Number(postsWithoutAuthor) === 0, `trouvés=${postsWithoutAuthor}`);

  const [{ count: orphanPostTags }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM post_tags pt
    LEFT JOIN posts p ON p.id = pt."postId"
    LEFT JOIN tags t ON t.id = pt."tagId"
    WHERE p.id IS NULL OR t.id IS NULL
  `;
  check("0 relation post_tags orpheline", Number(orphanPostTags) === 0, `trouvés=${orphanPostTags}`);

  console.log("\n--- Comparaison de 5 articles avant/après ---");

  const sampleMongoPosts = mongoPosts.slice(0, 5);

  for (const mp of sampleMongoPosts) {
    const pgPost = await prisma.post.findUnique({
      where: { slug: mp.slug },
      include: { author: true, _count: { select: { comments: true } } },
    });

    if (!pgPost) {
      check(`post "${mp.slug}"`, false, "absent de Postgres");
      continue;
    }

    const mongoAuthor = await User.findById(mp.author).lean();

    const titleMatch = pgPost.title === mp.title;
    const authorMatch = pgPost.author.name === mongoAuthor?.name;
    const commentCountMatch = pgPost._count.comments === mp.comments.length;

    check(
      `post "${mp.slug}"`,
      titleMatch && authorMatch && commentCountMatch,
      `titre=${titleMatch} auteur=${authorMatch} commentaires=${commentCountMatch}`
    );
  }

  await mongoose.disconnect();
  await prisma.$disconnect();

  console.log(`\n--- Résultat final : ${failures === 0 ? "SUCCÈS" : `${failures} échec(s)`} ---`);
  if (failures > 0) process.exit(1);
}

validate().catch((err) => {
  console.error(err);
  process.exit(1);
});
