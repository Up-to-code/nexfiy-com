import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export const canonicalPropertyValueValidator = v.object({
  propertyId: v.id("databaseProperties"),
  type: v.string(),
  text: v.union(v.string(), v.null()),
  number: v.union(v.number(), v.null()),
  boolean: v.union(v.boolean(), v.null()),
  dateStart: v.union(v.number(), v.null()),
  dateEnd: v.union(v.number(), v.null()),
  optionIds: v.array(v.id("databaseSelectOptions")),
});

export const canonicalBlockValidator = v.object({
  id: v.id("pageBlocks"),
  parentId: v.union(v.id("pageBlocks"), v.null()),
  type: v.string(),
  order: v.number(),
  text: v.union(v.string(), v.null()),
  checked: v.union(v.boolean(), v.null()),
  color: v.union(v.string(), v.null()),
  label: v.union(v.string(), v.null()),
  href: v.union(v.string(), v.null()),
  src: v.union(v.string(), v.null()),
  alt: v.union(v.string(), v.null()),
  caption: v.union(v.string(), v.null()),
  dataSourceId: v.union(v.id("dataSources"), v.null()),
  viewId: v.union(v.id("databaseViews"), v.null()),
  linkedPageId: v.union(v.id("documents"), v.null()),
  syncGroupId: v.union(v.id("syncedBlockGroups"), v.null()),
});

export const canonicalPageSummaryValidator = v.object({
  id: v.id("documents"),
  title: v.string(),
  icon: v.union(v.string(), v.null()),
  cover: v.union(v.string(), v.null()),
  parentId: v.union(v.id("documents"), v.null()),
  isPublished: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.union(v.number(), v.null()),
  properties: v.array(canonicalPropertyValueValidator),
});

type LegacyBlockNote = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
};

function legacyBlockNote(block: Doc<"pageBlocks">): LegacyBlockNote | null {
  if (block.type !== "blocknote" || !block.propsJson) return null;
  try {
    return JSON.parse(block.propsJson) as LegacyBlockNote;
  } catch {
    return null;
  }
}

function legacyText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const candidate = item as { type?: string; text?: string; content?: unknown };
      if (candidate.type === "text") return candidate.text ?? "";
      if (candidate.type === "link") return legacyText(candidate.content);
      return "";
    })
    .join("");
}

export function toCanonicalBlock(block: Doc<"pageBlocks">) {
  const legacy = legacyBlockNote(block);
  const legacyProps = legacy?.props ?? {};
  const isLegacyLink = legacy?.type === "linkCard";
  const isLegacyImage = legacy?.type === "image";
  const type = isLegacyLink
    ? "link"
    : block.type === "bookmark"
      ? "link"
      : block.type;
  const href = isLegacyLink
    ? typeof legacyProps.url === "string"
      ? legacyProps.url
      : null
    : block.type === "bookmark"
      ? block.url ?? null
      : null;
  const src = isLegacyImage
    ? typeof legacyProps.url === "string"
      ? legacyProps.url
      : null
    : block.type === "image" || block.type === "file"
      ? block.url ?? null
      : null;

  return {
    id: block._id,
    parentId: block.parentBlockId ?? null,
    type,
    order: block.order,
    text:
      type === "link" || type === "image" || type === "file"
        ? null
        : block.text ?? (legacy ? legacyText(legacy.content) : null),
    checked: block.checked ?? null,
    color: block.color ?? null,
    label:
      type === "link"
        ? block.text ??
          (typeof legacyProps.label === "string" ? legacyProps.label : href)
        : null,
    href,
    src,
    alt:
      type === "image"
        ? block.alt ??
          (typeof legacyProps.alt === "string" ? legacyProps.alt : null)
        : null,
    caption:
      type === "image"
        ? block.caption ??
          (typeof legacyProps.caption === "string" ? legacyProps.caption : null)
        : null,
    dataSourceId: block.dataSourceId ?? null,
    viewId: block.viewId ?? null,
    linkedPageId: block.linkedPageId ?? null,
    syncGroupId: block.syncGroupId ?? null,
  };
}

export function toCanonicalPropertyValue(
  value: Doc<"databasePropertyValues">,
) {
  return {
    propertyId: value.propertyId,
    type: value.type,
    text: value.textValue ?? null,
    number: value.numberValue ?? null,
    boolean: value.booleanValue ?? null,
    dateStart: value.dateStart ?? null,
    dateEnd: value.dateEnd ?? null,
    optionIds: value.optionIds ?? [],
  };
}

export async function listCanonicalPropertyValues(
  ctx: QueryCtx,
  documentId: Id<"documents">,
) {
  const values = await ctx.db
    .query("databasePropertyValues")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .take(100);
  return values.map(toCanonicalPropertyValue);
}

export function toCanonicalPageSummary(
  document: Doc<"documents">,
  properties: Awaited<ReturnType<typeof listCanonicalPropertyValues>> = [],
) {
  return {
    id: document._id,
    title: document.title,
    icon: document.icon ?? null,
    cover: document.coverImage ?? null,
    parentId: document.parentDocument ?? null,
    isPublished: document.isPublished,
    createdAt: document._creationTime,
    updatedAt: document.updatedAt ?? null,
    properties,
  };
}
