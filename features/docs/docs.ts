import "server-only";

import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

import { docsManifest } from "./docs-manifest";

const docsRoot = path.join(process.cwd(), "content", "docs");

export const getDoc = cache(async (slug: string) => {
  const entry = docsManifest.find((document) => document.slug === slug);
  if (!entry) return null;
  const source = await readFile(path.join(docsRoot, `${slug}.md`), "utf8");
  const parsed = matter(source);
  return {
    ...entry,
    title: String(parsed.data.title || entry.title),
    description: String(parsed.data.description || entry.description),
    content: parsed.content,
    source,
  };
});

export async function getAllDocs() {
  return await Promise.all(docsManifest.map((entry) => getDoc(entry.slug)));
}

export function getTableOfContents(markdown: string) {
  return markdown.split("\n").flatMap((line) => {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) return [];
    const title = match[2]
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
    return [
      {
        depth: match[1].length,
        title,
        id: headingId(title),
      },
    ];
  });
}

export function headingId(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
