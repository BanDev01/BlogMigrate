import mongoose from "mongoose";
import User from "../src/lib/models/User";
import Post from "../src/lib/models/Post";
import Tag from "../src/lib/models/Tag";
import prisma from "../src/lib/prisma";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/blogmigrate";
const BATCH_SIZE = 100;

async function insertInBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>
) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await insert(batch);
    console.log(`  ${label}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Vide les tables Postgres dans l'ordre inverse des dépendances
  await prisma.postTag.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
  console.log("Tables Postgres vidées");

  // --- Users ---
  const mongoUsers = await User.find().lean();
  const userIdMap = new Map<string, string>(); // ObjectId Mongo -> UUID Postgres

  const userRows = mongoUsers.map((u) => {
    const newId = crypto.randomUUID();
    userIdMap.set(u._id.toString(), newId);
    return {
      id: newId,
      name: u.name,
      email: u.email,
      avatar: u.avatar ?? null,
      bio: u.bio ?? null,
      createdAt: u.createdAt,
    };
  });

  await insertInBatches("users", userRows, (batch) =>
    prisma.user.createMany({ data: batch })
  );
  console.log(`✓ ${userRows.length} users migrés`);

  // --- Tags ---
  const mongoTags = await Tag.find().lean();
  const tagIdMap = new Map<string, string>(); // slug -> UUID Postgres

  const tagRows = mongoTags.map((t) => {
    const newId = crypto.randomUUID();
    tagIdMap.set(t.slug, newId);
    return { id: newId, name: t.name, slug: t.slug };
  });

  await insertInBatches("tags", tagRows, (batch) =>
    prisma.tag.createMany({ data: batch })
  );
  console.log(`✓ ${tagRows.length} tags migrés`);

  // --- Posts ---
  const mongoPosts = await Post.find().lean();
  const postIdMap = new Map<string, string>(); // ObjectId Mongo -> UUID Postgres

  const postRows = mongoPosts.map((p) => {
    const newId = crypto.randomUUID();
    postIdMap.set(p._id.toString(), newId);
    return {
      id: newId,
      title: p.title,
      slug: p.slug,
      content: p.content,
      authorId: userIdMap.get(p.author.toString())!,
      status: p.status,
      publishedAt: p.publishedAt ?? null,
      createdAt: p.createdAt,
    };
  });

  await insertInBatches("posts", postRows, (batch) =>
    prisma.post.createMany({ data: batch })
  );
  console.log(`✓ ${postRows.length} posts migrés`);

  // --- Commentaires imbriqués -> table comments ---
  const commentRows: {
    id: string;
    postId: string;
    authorId: string;
    content: string;
    createdAt: Date;
  }[] = [];

  for (const p of mongoPosts) {
    const postId = postIdMap.get(p._id.toString())!;
    for (const c of p.comments) {
      commentRows.push({
        id: crypto.randomUUID(),
        postId,
        authorId: userIdMap.get(c.author.toString())!,
        content: c.content,
        createdAt: c.createdAt,
      });
    }
  }

  await insertInBatches("comments", commentRows, (batch) =>
    prisma.comment.createMany({ data: batch })
  );
  console.log(`✓ ${commentRows.length} commentaires migrés`);

  // --- post_tags (jonction) ---
  const postTagRows: { postId: string; tagId: string }[] = [];

  for (const p of mongoPosts) {
    const postId = postIdMap.get(p._id.toString())!;
    for (const tagSlug of p.tags) {
      const tagId = tagIdMap.get(tagSlug);
      if (!tagId) {
        console.warn(`  ⚠ tag inconnu ignoré: "${tagSlug}" (post ${p.slug})`);
        continue;
      }
      postTagRows.push({ postId, tagId });
    }
  }

  await insertInBatches("post_tags", postTagRows, (batch) =>
    prisma.postTag.createMany({ data: batch, skipDuplicates: true })
  );
  console.log(`✓ ${postTagRows.length} relations post_tags migrées`);

  await mongoose.disconnect();
  await prisma.$disconnect();

  console.log("\n--- Rapport final ---");
  console.log(`users:      ${userRows.length}`);
  console.log(`tags:       ${tagRows.length}`);
  console.log(`posts:      ${postRows.length}`);
  console.log(`comments:   ${commentRows.length}`);
  console.log(`post_tags:  ${postTagRows.length}`);
  console.log("\nMigration terminée.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
