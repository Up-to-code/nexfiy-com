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
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#2383e2] uppercase">
          Nexfiy Journal
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Ideas for connected work.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-zinc-600 dark:text-white/60">
          Product notes, practical guides, and the thinking behind a workspace
          made for people and tools.
        </p>
        {!available ? (
          <p className="mt-16 rounded-xl border border-dashed p-8 text-zinc-500">
            The journal is temporarily unavailable. Please check back shortly.
          </p>
        ) : null}
        {available && posts.length === 0 ? (
          <p className="mt-16 border-t pt-8 text-zinc-500">
            The first story is being prepared.
          </p>
        ) : null}
        <div className="mt-16 divide-y border-y">
          {posts.map((post) => (
            <article
              key={post.id}
              className="grid gap-5 py-8 md:grid-cols-[1fr_2fr_auto] md:items-start"
            >
              <p className="text-sm text-zinc-500">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Journal"}
              </p>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-[#2383e2]"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-white/60">
                  {post.excerpt}
                </p>
                <p className="mt-3 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  {post.tags.join(" · ")}
                </p>
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className="text-sm font-semibold text-[#2383e2]"
              >
                Read story →
              </Link>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
