import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/features/blog/blog-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.nexfiy.com";
  const staticRoutes = [
    "",
    "/pricing",
    "/docs",
    "/blog",
    "/privacy",
    "/terms",
    "/refund-policy",
  ];
  const { posts } = await getPublishedPosts();
  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date(),
      changeFrequency:
        route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.7,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt ?? Date.now()),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}
