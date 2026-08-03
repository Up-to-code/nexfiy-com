import type { ReactNode } from "react";
import Image from "next/image";
import type { BlogBlock } from "./blog-api";

function embed(url: string) {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname === "youtu.be"
    ) {
      const id =
        parsed.hostname === "youtu.be"
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function BlockShell({ children }: { children: ReactNode }) {
  return <div className="my-4">{children}</div>;
}

export function BlogBlocks({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="blog-blocks">
      {blocks.map((block) => {
        const text = block.text ?? "";
        if (block.type === "heading_1") return <h2 key={block.id}>{text}</h2>;
        if (block.type === "heading_2") return <h3 key={block.id}>{text}</h3>;
        if (block.type === "heading_3") return <h4 key={block.id}>{text}</h4>;
        if (block.type === "bulleted_list")
          return (
            <ul key={block.id}>
              <li>{text}</li>
            </ul>
          );
        if (block.type === "numbered_list")
          return (
            <ol key={block.id}>
              <li>{text}</li>
            </ol>
          );
        if (block.type === "checklist") return <p key={block.id}>☑ {text}</p>;
        if (block.type === "quote")
          return <blockquote key={block.id}>{text}</blockquote>;
        if (block.type === "callout")
          return <aside key={block.id}>{text}</aside>;
        if (block.type === "divider") return <hr key={block.id} />;
        if (block.type === "image" && block.src) {
          return (
            <BlockShell key={block.id}>
              <Image
                src={block.src}
                alt={block.alt || "Article illustration"}
                width={1200}
                height={630}
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
                className="h-auto w-full rounded-md border"
              />
              {block.caption ? (
                <p className="mt-2 text-center text-sm text-zinc-500">
                  {block.caption}
                </p>
              ) : null}
            </BlockShell>
          );
        }
        if (block.type === "link" && block.href) {
          const video = embed(block.href);
          if (video)
            return (
              <BlockShell key={block.id}>
                <iframe
                  src={video}
                  title={text || "YouTube video"}
                  className="aspect-video w-full rounded-md border"
                  allowFullScreen
                />
              </BlockShell>
            );
          return (
            <a
              key={block.id}
              href={block.href}
              target="_blank"
              rel="noreferrer"
              className="blog-link-row my-5 block border-y py-4 font-medium"
            >
              {block.label || block.href}
              <span className="mt-1 block text-sm font-normal text-zinc-500">
                {block.href}
              </span>
            </a>
          );
        }
        if (block.type === "file" && block.src)
          return (
            <p key={block.id}>
              <a href={block.src}>{block.label || "Download file"}</a>
            </p>
          );
        if (block.type === "database_view")
          return (
            <aside key={block.id}>
              Live database view · {text || "Open in Nexfiy"}
            </aside>
          );
        if (block.type === "child_page")
          return <aside key={block.id}>Linked page · {text}</aside>;
        if (block.type === "synced_reference")
          return <aside key={block.id}>Synced block · {text}</aside>;
        return <p key={block.id}>{text}</p>;
      })}
    </div>
  );
}
