import Link from "next/link";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true } },
        _count: { select: { comments: true } },
        postTags: { include: { tag: true } },
      },
    }),
    prisma.post.count({ where: { status: "published" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">BlogMigrate</h1>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            {total} articles migrés en direct de MongoDB vers Supabase (PostgreSQL) — données en temps réel.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur">Next.js</span>
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur">Supabase</span>
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur">Prisma</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/posts/${post.slug}`}
                    className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 hover:underline line-clamp-2"
                  >
                    {post.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                    <span>{post.author?.name ?? "Unknown"}</span>
                    <span>·</span>
                    <span>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                    <span>·</span>
                    <span>{post._count.comments} commentaires</span>
                  </div>
                </div>
              </div>
              {post.postTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.postTags.slice(0, 5).map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/?page=${page - 1}`}
                className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                ← Précédent
              </Link>
            )}
            <span className="text-sm text-zinc-500">
              Page {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/?page=${page + 1}`}
                className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Suivant →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
