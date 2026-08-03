import { getAllDocs } from "@/features/docs/docs";
import { getPublishedPost, getPublishedPosts } from "@/features/blog/blog-api";
import type { BlogBlock } from "@/features/blog/blog-api";

function blockMarkdown(block: BlogBlock) {
  const text = block.text ?? "";
  if (block.type === "heading_1") return `## ${text}`;
  if (block.type === "heading_2") return `### ${text}`;
  if (block.type === "heading_3") return `#### ${text}`;
  if (block.type === "bulleted_list") return `- ${text}`;
  if (block.type === "numbered_list") return `1. ${text}`;
  if (block.type === "quote") return `> ${text}`;
  if (block.type === "image" && block.src)
    return `![${block.alt || "Article image"}](${block.src})`;
  if (block.type === "link" && block.href)
    return `[${block.label || block.href}](${block.href})`;
  if (block.type === "file" && block.src)
    return `[${block.label || block.src}](${block.src})`;
  return text;
}

export async function GET() {
  const documents = await getAllDocs();
  const docsContent = documents
    .filter((document) => document !== null)
    .map((document) => document.source)
    .join("\n\n---\n\n");
  const { posts } = await getPublishedPosts();
  const articles = await Promise.all(
    posts.map((post) => getPublishedPost(post.slug)),
  );
  const blogContent = articles
    .filter((post) => post?.blocks)
    .map(
      (post) =>
        `# ${post!.title}\n\n${post!.excerpt}\n\n${post!
          .blocks!.map(blockMarkdown)
          .filter(Boolean)
          .join("\n\n")}`,
    )
    .join("\n\n---\n\n");
  const content = [docsContent, blogContent]
    .filter(Boolean)
    .join("\n\n---\n\n");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
