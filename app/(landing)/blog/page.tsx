import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../_components/Footer";
import { getPublishedPosts } from "@/features/blog/blog-api";

export const metadata: Metadata = {
  title: "Nexfiy Blog — Building connected workspaces",
  description:
    "Notes on connected knowledge, databases, MCP, APIs, and calm collaboration from the Nexfiy team.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const { available, posts } = await getPublishedPosts();
  return (
    <>
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <header className="grid gap-8 border-b pb-12 md:grid-cols-[minmax(0,1fr)_15rem] md:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-500">Nexfiy journal</p>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Notes from the work.
            </h1>
          </div>
          <p className="text-sm leading-6 text-zinc-500 dark:text-white/50">
            Product decisions, practical guides, and clear thinking about
            connected knowledge.
          </p>
        </header>
        {!available ? (
          <p className="border-b py-8 text-sm text-zinc-500">
            The journal is temporarily unavailable. Please check back shortly.
          </p>
        ) : null}
        {available && posts.length === 0 ? (
          <p className="border-b py-8 text-sm text-zinc-500">
            The first story is being prepared.
          </p>
        ) : null}
        <div className="divide-y">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group grid gap-4 py-8 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-8"
            >
              <p className="pt-1 text-xs tabular-nums text-zinc-400">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en", {
                      month: "2-digit",
                      day: "numeric",
                      year: "2-digit",
                    })
                  : "—"}
              </p>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="outline-none transition-colors group-hover:text-[#2383e2] focus-visible:text-[#2383e2]"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-white/50">
                  {post.excerpt}
                </p>
                {post.tags.length ? (
                  <p className="mt-4 text-xs text-zinc-400">
                    {post.tags.join(" / ")}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {available && posts.length ? (
          <p className="border-t pt-5 text-xs text-zinc-400">
            {posts.length} {posts.length === 1 ? "note" : "notes"}
          </p>
        ) : null}
      </section>
      <Footer />
    </>
  );
}
