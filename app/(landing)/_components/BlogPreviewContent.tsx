"use client";

import Link from "next/link";
import type { BlogPost } from "@/features/blog/blog-api";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function BlogPreviewContent({ posts }: { posts: BlogPost[] }) {
  const { t, resolvedLocale } = useI18n();

  return (
    <section className="dark:bg-background border-t bg-[#f9f8f6] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#2383e2] uppercase">
              {t("blogPreview.eyebrow")}
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em]">
              {t("blogPreview.title")}
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden text-sm font-semibold text-[#2383e2] sm:block"
          >
            {t("blogPreview.viewAll")}
          </Link>
        </div>
        <div className="mt-12 divide-y border-y">
          {posts.slice(0, 3).map((post) => (
            <article
              key={post.id}
              className="grid gap-4 py-7 md:grid-cols-[1fr_2fr_auto] md:items-center"
            >
              <p className="text-sm text-zinc-500">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString(
                      resolvedLocale,
                      {
                        month: "short",
                        day: "numeric",
                      },
                    )
                  : t("blogPreview.journal")}
              </p>
              <div>
                <h3 className="text-xl font-semibold">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-[#2383e2]"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-white/60">
                  {post.excerpt}
                </p>
              </div>
              <Link
                href={`/blog/${post.slug}`}
                aria-label={`Read ${post.title}`}
                className="text-[#2383e2]"
              >
                →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
