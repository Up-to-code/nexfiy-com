import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogBlocks } from "@/features/blog/BlogBlocks";
import { getPublishedPost, getPublishedPosts } from "@/features/blog/blog-api";
import { Footer } from "../../_components/Footer";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { posts } = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Nexfiy`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: post.coverImage ? [post.coverImage] : ["/social/opengraph.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage
        ? [post.coverImage]
        : ["/social/twitter-banner.png"],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post?.blocks) notFound();
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Link href="/blog" className="text-sm font-semibold text-[#2383e2]">
          ← Nexfiy Journal
        </Link>
        <header className="mt-10 border-b pb-10">
          <p className="text-sm tracking-[0.16em] text-zinc-500 uppercase">
            {post.tags.join(" · ")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {post.title}
          </h1>
          <p className="mt-5 text-xl leading-8 text-zinc-600 dark:text-white/60">
            {post.excerpt}
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            {post.author}
            {post.publishedAt
              ? ` · ${new Date(post.publishedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}`
              : ""}
          </p>
        </header>
        <div className="mt-12">
          <BlogBlocks blocks={post.blocks} />
        </div>
      </article>
      <Footer />
    </>
  );
}
