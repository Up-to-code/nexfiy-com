import { getPublishedPosts } from "@/features/blog/blog-api";
import { BlogPreviewContent } from "./BlogPreviewContent";

export async function BlogPreview() {
  const { available, posts } = await getPublishedPosts();
  if (!available || posts.length === 0) return null;
  return <BlogPreviewContent posts={posts} />;
}
