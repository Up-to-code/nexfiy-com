import type { Metadata } from "next";
import Image from "next/image";
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
      <article className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
        <Link
          href="/blog"
          className="text-sm text-zinc-500 transition-colors hover:text-[#2383e2]"
        >
          Journal / All notes
        </Link>
        <header className="mt-8 border-y py-10 sm:py-14">
          <div className="grid gap-8 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-12">
            <div className="space-y-3 text-xs leading-5 text-zinc-400">
              {post.publishedAt ? (
                <p>
                  {new Date(post.publishedAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
              <p>{post.author}</p>
              {post.tags.length ? <p>{post.tags.join(" / ")}</p> : null}
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-500 dark:text-white/50">
                {post.excerpt}
              </p>
            </div>
          </div>
        </header>
        <div className="grid md:grid-cols-[8rem_minmax(0,42rem)] md:gap-12">
          <div aria-hidden="true" />
          <div>
            <div className="mt-10 aspect-[16/9] overflow-hidden bg-zinc-100 sm:mt-14 dark:bg-white/5">
              <Image
                src={post.coverImage || "/social/opengraph.png"}
                alt=""
                width={1200}
                height={675}
                sizes="(max-width: 768px) 100vw, 672px"
                unoptimized
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div className="pt-10 sm:pt-14">
            <BlogBlocks blocks={post.blocks} />
            </div>
          </div>
        </div>
      </article>
      <Footer />
    </>
  );
}
