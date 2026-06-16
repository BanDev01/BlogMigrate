import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import User from "../src/lib/models/User";
import Post from "../src/lib/models/Post";
import Tag from "../src/lib/models/Tag";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/blogmigrate";

const TAG_POOL = [
  "javascript", "typescript", "react", "nextjs", "nodejs",
  "css", "tailwindcss", "html", "webdev", "frontend",
  "backend", "fullstack", "database", "mongodb", "postgresql",
  "docker", "devops", "api", "graphql", "rest",
  "performance", "security", "testing", "open-source", "career",
  "productivity", "tutorial", "beginner", "advanced", "architecture",
  "microservices", "serverless", "cloud", "aws", "vercel",
  "git", "linux", "python", "rust", "golang",
  "mobile", "ux", "design", "accessibility", "seo",
  "ai", "machine-learning", "tooling", "debugging", "refactoring",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Tag.deleteMany({}),
  ]);
  console.log("Collections cleared");

  // Seed Tags
  const tagDocs = await Tag.insertMany(
    TAG_POOL.map((name) => ({ name, slug: slugify(name) }))
  );
  console.log(`✓ ${tagDocs.length} tags inserted`);

  // Seed Users
  const users = Array.from({ length: 50 }, () => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    avatar: faker.image.avatar(),
    bio: faker.lorem.sentences(2),
    createdAt: faker.date.past({ years: 3 }),
  }));
  const userDocs = await User.insertMany(users);
  console.log(`✓ ${userDocs.length} users inserted`);

  // Seed Posts with embedded comments
  const posts = [];
  const slugSeen = new Set<string>();

  for (let i = 0; i < 500; i++) {
    const author = userDocs[Math.floor(Math.random() * userDocs.length)];

    let title = faker.lorem.words({ min: 4, max: 10 });
    let slug = slugify(title);
    while (slugSeen.has(slug)) {
      title = faker.lorem.words({ min: 4, max: 10 });
      slug = slugify(title);
    }
    slugSeen.add(slug);

    const tagCount = Math.floor(Math.random() * 6) + 2; // 2–8 tags
    const shuffled = [...TAG_POOL].sort(() => 0.5 - Math.random());
    const postTags = shuffled.slice(0, tagCount);

    const commentCount = Math.floor(Math.random() * 10) + 1; // 1–10 comments
    const comments = Array.from({ length: commentCount }, () => ({
      author: userDocs[Math.floor(Math.random() * userDocs.length)]._id,
      content: faker.lorem.sentences({ min: 1, max: 4 }),
      createdAt: faker.date.recent({ days: 60 }),
    }));

    const publishedAt = faker.date.past({ years: 2 });

    posts.push({
      title,
      slug,
      content: faker.lorem.paragraphs({ min: 5, max: 12 }, "\n\n"),
      author: author._id,
      tags: postTags,
      comments,
      status: "published" as const,
      publishedAt,
      createdAt: publishedAt,
    });
  }

  await Post.insertMany(posts);

  const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);
  console.log(`✓ ${posts.length} posts inserted`);
  console.log(`✓ ${totalComments} embedded comments inserted`);

  await mongoose.disconnect();
  console.log("\nSeed complete.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
