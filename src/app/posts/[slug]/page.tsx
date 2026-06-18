import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await prisma.post.findFirst({
    where: { slug, status: "published" },
    include: {
      author: { select: { name: true, avatar: true } },
      postTags: { include: { tag: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!post) notFound();

  const author = post.author;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Tous les articles
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <article>
          <div className="mb-6 flex flex-wrap gap-2">
            {post.postTags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                {tag.name}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50 mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 mb-10 text-sm text-zinc-500">
            {author?.avatar && (
              <img
                src={author.avatar}
                alt={author.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {author?.name}
            </span>
            <span>·</span>
            <span>
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </span>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none">
            {post.content.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-4 leading-7 text-zinc-700 dark:text-zinc-300">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <section className="mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
          <h2 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-50">
            {post.comments.length} commentaire
            {post.comments.length !== 1 ? "s" : ""}
          </h2>

          <div className="space-y-6">
            {post.comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {comment.author?.name ?? "Utilisateur inconnu"}
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-500">
                    {new Date(comment.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-6">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
