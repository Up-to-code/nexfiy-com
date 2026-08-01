"use client";

import type { UploadRouter } from "@/app/api/uploadthing/core";
import { generateReactHelpers } from "@uploadthing/react";

const { uploadFiles } = generateReactHelpers<UploadRouter>();

export type UploadEndpoint = "coverImage" | "documentFile";

export const uploadFile = async (endpoint: UploadEndpoint, file: File) => {
  const uploaded = await uploadFiles(endpoint, { files: [file] });
  const url = uploaded[0]?.serverData?.url;
  if (!url) throw new Error("Upload completed without a file URL");
  return url;
};

export const isUploadThingUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname.endsWith(".ufs.sh") || url.hostname === "utfs.io";
  } catch {
    return false;
  }
};

export const deleteUploadedFiles = async (urls: string[]) => {
  const uploadThingUrls = [...new Set(urls.filter(isUploadThingUrl))];
  if (uploadThingUrls.length === 0) return;

  const response = await fetch("/api/uploadthing/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ urls: uploadThingUrls }),
  });
  if (!response.ok) throw new Error("Failed to delete uploaded files");
};

const MEDIA_BLOCK_TYPES = new Set(["image", "video", "audio", "file", "pdf"]);

export const getDocumentUrls = (document: {
  coverImage?: string;
  content?: string;
}): string[] => {
  const urls: string[] = [];
  if (document.coverImage && isUploadThingUrl(document.coverImage)) {
    urls.push(document.coverImage);
  }

  if (document.content) {
    try {
      const blocks = JSON.parse(document.content) as Array<{
        type?: string;
        props?: { url?: string };
        children?: unknown[];
      }>;
      const traverse = (items: typeof blocks) => {
        for (const block of items) {
          if (
            block.type &&
            MEDIA_BLOCK_TYPES.has(block.type) &&
            block.props?.url &&
            isUploadThingUrl(block.props.url)
          ) {
            urls.push(block.props.url);
          }
          if (block.children?.length) traverse(block.children as typeof blocks);
        }
      };
      traverse(blocks);
    } catch {
      return urls;
    }
  }
  return urls;
};
