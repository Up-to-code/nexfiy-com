import type { Metadata } from "next";
import Image from "next/image";
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
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <header className="grid gap-6 border-b pb-10 md:grid-cols-[minmax(0,1fr)_15rem] md:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-500">Nexfiy journal</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Notes, guides, and product thinking.
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
        <div className="grid gap-x-6 gap-y-12 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group min-w-0"
            >
              <Link href={`/blog/${post.slug}`} className="block outline-none">
                <div className="aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-white/5">
                  <Image
                    src={post.coverImage || "/social/opengraph.png"}
                    alt=""
                    width={1200}
                    height={900}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
                  />
                </div>
              </Link>
              <div className="mt-4 flex items-center justify-between gap-4 text-xs text-zinc-400">
                <p className="truncate">{post.tags.join(" / ") || "Journal"}</p>
                <p className="shrink-0 tabular-nums">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="outline-none transition-colors group-hover:text-[#2383e2] focus-visible:text-[#2383e2]"
                  >
                    {post.title}
                  </Link>
              </h2>
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
