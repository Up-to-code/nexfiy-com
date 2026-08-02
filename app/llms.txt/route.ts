import { docsHref, docsManifest } from "@/features/docs/docs-manifest";
import { getPublishedPosts } from "@/features/blog/blog-api";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const { posts } = await getPublishedPosts();
  const lines = [
    "# Nexfiy",
    "",
    "> Public developer documentation for the Nexfiy Content API and MCP server.",
    "",
    ...docsManifest.map(
      (entry) =>
        `- [${entry.title}](${origin}${docsHref(entry.slug)}): ${entry.description}`,
    ),
    "",
    "## Published articles",
    "",
    ...posts.map(
      (post) =>
        `- [${post.title}](${origin}/blog/${post.slug}): ${post.excerpt}`,
    ),
    "",
    `- [Complete Markdown bundle](${origin}/llms-full.txt)`,
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
