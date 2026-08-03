import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "../_components/Footer";
import { getPublishedPosts } from "@/features/blog/blog-api";

export const metadata: Metadata = {
  title: "Blog — Building connected workspaces",
  description:
    "Notes on connected knowledge, databases, MCP, APIs, and calm collaboration from the Nexfiy team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Nexfiy Blog — Building connected workspaces",
    description:
      "Notes on connected knowledge, databases, MCP, APIs, and calm collaboration from the Nexfiy team.",
    type: "website",
    url: "/blog",
  },
};

export default async function BlogPage() {
  const { available, posts } = await getPublishedPosts();
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20">
        <header className="border-b border-zinc-200 pb-10 sm:pb-14 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2383e2]">
            Nexfiy Journal
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end md:gap-12">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">
              Ideas for work that stays connected.
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-500 dark:text-white/55">
              Practical notes on building connected knowledge for people,
              products, and AI.
            </p>
          </div>
        </header>
        {!available ? (
          <div className="flex items-center gap-3 py-8 text-sm text-zinc-500 dark:text-white/45">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-amber-400"
            />
            <p>The journal is taking a short break. Check back soon.</p>
          </div>
        ) : null}
        {available && posts.length === 0 ? (
          <div className="flex items-center gap-3 py-8 text-sm text-zinc-500 dark:text-white/45">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-[#2383e2]"
            />
            <p>The first story is on its way.</p>
          </div>
        ) : null}
        <div className="grid gap-x-6 gap-y-12 py-10 sm:grid-cols-2 lg:grid-cols-3 lg:py-12">
          {posts.map((post) => (
            <article key={post.id} className="group min-w-0">
              <Link href={`/blog/${post.slug}`} className="block outline-none">
                <div className="aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-white/5">
                  <Image
                    src={post.coverImage || "/social/opengraph.png"}
                    alt={post.title}
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
                  className="transition-colors outline-none group-hover:text-[#2383e2] focus-visible:text-[#2383e2]"
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
