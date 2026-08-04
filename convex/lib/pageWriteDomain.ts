import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { moveLinkedChildPage } from "./childPageDomain";
import { syncDatabaseName } from "./databaseDomain";
import {
  listCanonicalPropertyValues,
  toCanonicalBlock,
  toCanonicalPageSummary,
} from "./pageContentDomain";
import {
  assertSyncedReferenceDestination,
  moveSyncGroupSources,
} from "./syncedBlockDomain";

const pageError = (code: string, message: string) =>
  new ConvexError({ code, message });

export type PageBlockType = Doc<"pageBlocks">["type"];

export const pageBlockTypeValidator = v.union(
  v.literal("paragraph"),
  v.literal("heading_1"),
  v.literal("heading_2"),
  v.literal("heading_3"),
  v.literal("bulleted_list"),
  v.literal("numbered_list"),
  v.literal("checklist"),
  v.literal("quote"),
  v.literal("callout"),
  v.literal("toggle"),
  v.literal("divider"),
  v.literal("image"),
  v.literal("file"),
  v.literal("bookmark"),
  v.literal("database_view"),
  v.literal("child_page"),
  v.literal("columns"),
  v.literal("column"),
  v.literal("synced_reference"),
  v.literal("blocknote"),
);

export const blockBlueprintValidator = v.object({
  key: v.string(),
  parentKey: v.optional(v.string()),
  type: pageBlockTypeValidator,
  text: v.optional(v.string()),
  checked: v.optional(v.boolean()),
  url: v.optional(v.string()),
  alt: v.optional(v.string()),
  caption: v.optional(v.string()),
  color: v.optional(v.string()),
  propsJson: v.optional(v.string()),
  dataSourceId: v.optional(v.id("dataSources")),
  viewId: v.optional(v.id("databaseViews")),
});

export type BlockBlueprint = {
  key: string;
  parentKey?: string;
  type: PageBlockType;
  text?: string;
  checked?: boolean;
  url?: string;
  alt?: string;
  caption?: string;
  color?: string;
  propsJson?: string;
  dataSourceId?: Id<"dataSources">;
  viewId?: Id<"databaseViews">;
};

export const CONTAINER_BLOCK_TYPES = new Set<PageBlockType>([
  "callout",
  "toggle",
  "columns",
  "column",
]);

export async function requireDynamicPage(
  ctx: { db: MutationCtx["db"] },
  workspaceId: string,
  pageId: Doc<"documents">["_id"],
) {
  const page = await ctx.db.get(pageId);
  if (!page || page.userId !== workspaceId || page.isArchived) {
    throw pageError("PAGE_NOT_FOUND", "Page not found in this workspace");
  }
  if (page.contentModel !== "page_blocks" || page.kind === "database") {
    throw pageError(
      "DYNAMIC_PAGE_REQUIRED",
      "This operation requires a page created with the page_blocks content model",
    );
  }
  return page;
}

export async function pageBlockSiblings(
  ctx: { db: MutationCtx["db"] },
  pageId: Doc<"documents">["_id"],
  parentBlockId?: Doc<"pageBlocks">["_id"],
) {
  return (
    await ctx.db
      .query("pageBlocks")
      .withIndex("by_page_and_parent", (q) =>
        q.eq("pageId", pageId).eq("parentBlockId", parentBlockId),
      )
      .take(500)
  ).sort((left, right) => left.order - right.order);
}

export type CreatePageInput = {
  title: string;
  parentId?: Id<"documents">;
  content?: string;
  icon?: string;
  cover?: string;
  isPublished?: boolean;
  contentModel?: "blocknote" | "page_blocks";
};

export async function createPage(
  ctx: MutationCtx,
  workspaceId: string,
  input: CreatePageInput,
) {
  const title = input.title.trim();
  if (!title || title.length > 200) {
    throw pageError("INVALID_TITLE", "Title must contain 1 to 200 characters");
  }
  if (input.content && input.content.length > 100_000) {
    throw pageError(
      "CONTENT_TOO_LARGE",
      "Document content exceeds 100,000 characters",
    );
  }
  if (input.parentId) {
    const parent = await ctx.db.get(input.parentId);
    if (!parent || parent.userId !== workspaceId || parent.isArchived) {
      throw pageError(
        "INVALID_PARENT",
        "Parent document is unavailable in this workspace",
      );
    }
  }
  const now = Date.now();
  const contentModel = input.contentModel ?? "page_blocks";
  const id = await ctx.db.insert("documents", {
    title,
    parentDocument: input.parentId,
    content: input.content,
    coverImage: input.cover?.trim() ? input.cover.trim().slice(0, 5_000) : undefined,
    icon: input.icon?.slice(0, 20),
    userId: workspaceId,
    fullWidth: true,
    showToc: true,
    isArchived: false,
    isPublished: input.isPublished ?? false,
    kind: "page",
    contentModel,
    updatedAt: now,
  });
  if (contentModel === "page_blocks") {
    await ctx.db.insert("pageBlocks", {
      workspaceId,
      pageId: id,
      type: "paragraph",
      order: 0,
      text: "",
      createdAt: now,
      updatedAt: now,
    });
  }
  return { id, title, parentId: input.parentId ?? null };
}

export async function archivePage(
  ctx: MutationCtx,
  workspaceId: string,
  documentId: Id<"documents">,
) {
  const document = await ctx.db.get(documentId);
  if (!document || document.userId !== workspaceId || document.isArchived) {
    return false;
  }
  await ctx.db.patch(documentId, {
    isArchived: true,
    updatedAt: Date.now(),
  });
  return true;
}

export type UpdatePageInput = {
  documentId: Id<"documents">;
  title?: string;
  content?: string;
  icon?: string;
  cover?: string;
  isPublished?: boolean;
};

export async function updatePage(
  ctx: MutationCtx,
  workspaceId: string,
  input: UpdatePageInput,
) {
  const document = await ctx.db.get(input.documentId);
  if (!document || document.userId !== workspaceId || document.isArchived) {
    return null;
  }
  const title = input.title?.trim();
  if (input.title !== undefined && (!title || title.length > 200)) {
    throw pageError("INVALID_TITLE", "Title must contain 1 to 200 characters");
  }
  if (input.content && input.content.length > 100_000) {
    throw pageError(
      "CONTENT_TOO_LARGE",
      "Document content exceeds 100,000 characters",
    );
  }
  if (title !== undefined) {
    await syncDatabaseName(ctx, workspaceId, document, title);
  }
  const patch: Partial<Doc<"documents">> = { updatedAt: Date.now() };
  if (title !== undefined) patch.title = title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.icon !== undefined) patch.icon = input.icon.slice(0, 20);
  if (input.cover !== undefined) {
    patch.coverImage = input.cover.trim()
      ? input.cover.trim().slice(0, 5_000)
      : undefined;
  }
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished;
  await ctx.db.patch(input.documentId, patch);
  const updated = await ctx.db.get(input.documentId);
  if (!updated) return null;
  const [properties, blocks] = await Promise.all([
    listCanonicalPropertyValues(ctx, updated._id),
    ctx.db
      .query("pageBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", updated._id))
      .take(1_001),
  ]);
  return {
    ...toCanonicalPageSummary(updated, properties),
    blocks: blocks.slice(0, 1_000).map(toCanonicalBlock),
    blocksTruncated: blocks.length > 1_000,
  };
}

export async function createBlocks(
  ctx: MutationCtx,
  workspaceId: string,
  pageId: Id<"documents">,
  blocks: BlockBlueprint[],
) {
  await requireDynamicPage(ctx, workspaceId, pageId);
  if (!blocks.length || blocks.length > 250) {
    throw pageError(
      "INVALID_BLOCK_BLUEPRINT",
      "A block blueprint must contain 1 to 250 blocks",
    );
  }
  let existing = await ctx.db
    .query("pageBlocks")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .take(2_000);
  const placeholder =
    existing.length === 1 &&
    existing[0].type === "paragraph" &&
    existing[0].parentBlockId === undefined &&
    !(existing[0].text ?? "").trim()
      ? existing[0]
      : null;
  if (placeholder) {
    await ctx.db.delete(placeholder._id);
    existing = [];
  }
  if (existing.length + blocks.length > 2_000) {
    throw pageError("BLOCK_LIMIT", "This page has reached its block limit");
  }
  const idsByKey = new Map<string, Doc<"pageBlocks">["_id"]>();
  const typesByKey = new Map<string, PageBlockType>();
  const nextOrderByParent = new Map<string, number>();
  for (const block of existing) {
    const parentKey = block.parentBlockId ?? "root";
    nextOrderByParent.set(
      parentKey,
      Math.max(nextOrderByParent.get(parentKey) ?? 0, block.order + 1),
    );
  }
  const created: Array<{
    key: string;
    id: Doc<"pageBlocks">["_id"];
    parentBlockId: Doc<"pageBlocks">["_id"] | null;
  }> = [];

  for (const [index, blueprint] of blocks.entries()) {
    const key = blueprint.key.trim();
    if (blueprint.type === "synced_reference" || blueprint.type === "child_page") {
      throw pageError(
        "INVALID_BLOCK_TYPE",
        "Use the dedicated synced-reference or child-page operation for this block type",
      );
    }
    if (!key || key.length > 80 || idsByKey.has(key)) {
      throw pageError(
        "INVALID_BLOCK_KEY",
        `Block ${index + 1} has an empty, duplicate, or oversized key`,
      );
    }
    const parentKey = blueprint.parentKey?.trim();
    const parentBlockId = parentKey ? idsByKey.get(parentKey) : undefined;
    const parentType = parentKey ? typesByKey.get(parentKey) : undefined;
    if (parentKey && (!parentBlockId || !parentType)) {
      throw pageError(
        "INVALID_BLOCK_PARENT",
        `Block ${index + 1} references a parent that must appear earlier`,
      );
    }
    if (parentType && !CONTAINER_BLOCK_TYPES.has(parentType)) {
      throw pageError(
        "INVALID_BLOCK_PARENT",
        `Block ${index + 1} has a parent that cannot contain children`,
      );
    }
    if (blueprint.type === "column" && (!parentType || parentType !== "columns")) {
      throw pageError(
        "INVALID_COLUMN_PARENT",
        "Column blocks must be direct children of a columns block",
      );
    }
    if (blueprint.propsJson) {
      try {
        JSON.parse(blueprint.propsJson);
      } catch {
        throw pageError(
          "INVALID_BLOCK_PROPS",
          `Block ${index + 1} properties must be valid JSON`,
        );
      }
    }
    if (blueprint.type === "database_view") {
      if (!blueprint.dataSourceId || !blueprint.viewId) {
        throw pageError(
          "DATABASE_VIEW_REQUIRED",
          "Database view blocks require dataSourceId and viewId",
        );
      }
      const [source, view] = await Promise.all([
        ctx.db.get(blueprint.dataSourceId),
        ctx.db.get(blueprint.viewId),
      ]);
      if (
        !source ||
        !view ||
        source.workspaceId !== workspaceId ||
        view.workspaceId !== workspaceId ||
        view.dataSourceId !== source._id
      ) {
        throw pageError(
          "DATABASE_VIEW_UNAVAILABLE",
          `Block ${index + 1} references an unavailable database view`,
        );
      }
    }
    const parentOrderKey = parentBlockId ?? "root";
    const order = nextOrderByParent.get(parentOrderKey) ?? 0;
    const now = Date.now();
    const id = await ctx.db.insert("pageBlocks", {
      workspaceId,
      pageId,
      parentBlockId,
      type: blueprint.type,
      order,
      text: blueprint.text?.slice(0, 50_000),
      checked: blueprint.checked,
      url: blueprint.url?.slice(0, 5_000),
      alt: blueprint.alt?.slice(0, 1_000),
      caption: blueprint.caption?.slice(0, 5_000),
      color: blueprint.color?.slice(0, 50),
      propsJson: blueprint.propsJson,
      dataSourceId: blueprint.dataSourceId,
      viewId: blueprint.viewId,
      createdAt: now,
      updatedAt: now,
    });
    idsByKey.set(key, id);
    typesByKey.set(key, blueprint.type);
    nextOrderByParent.set(parentOrderKey, order + 1);
    created.push({ key, id, parentBlockId: parentBlockId ?? null });
  }
  return created;
}

export type UpdateBlockInput = {
  blockId: Id<"pageBlocks">;
  text?: string;
  checked?: boolean;
  url?: string;
  alt?: string;
  caption?: string;
  color?: string;
};

export async function updateBlock(
  ctx: MutationCtx,
  workspaceId: string,
  input: UpdateBlockInput,
) {
  const block = await ctx.db.get(input.blockId);
  if (!block || block.workspaceId !== workspaceId) {
    throw pageError("BLOCK_NOT_FOUND", "Block not found in this workspace");
  }
  await ctx.db.patch(block._id, {
    ...(input.text !== undefined ? { text: input.text.slice(0, 50_000) } : {}),
    ...(input.checked !== undefined ? { checked: input.checked } : {}),
    ...(input.url !== undefined ? { url: input.url.slice(0, 5_000) } : {}),
    ...(input.alt !== undefined ? { alt: input.alt.slice(0, 1_000) } : {}),
    ...(input.caption !== undefined
      ? { caption: input.caption.slice(0, 5_000) }
      : {}),
    ...(input.color !== undefined ? { color: input.color.slice(0, 50) } : {}),
    updatedAt: Date.now(),
  });
  return null;
}

export type MoveBlockInput = {
  blockId: Id<"pageBlocks">;
  targetPageId: Id<"documents">;
  targetBlockId?: Id<"pageBlocks">;
  placement: "before" | "after" | "inside";
};

export async function moveBlock(
  ctx: MutationCtx,
  workspaceId: string,
  input: MoveBlockInput,
) {
  const block = await ctx.db.get(input.blockId);
  if (!block || block.workspaceId !== workspaceId) {
    throw pageError("BLOCK_NOT_FOUND", "Block not found in this workspace");
  }
  await requireDynamicPage(ctx, workspaceId, input.targetPageId);
  const target = input.targetBlockId ? await ctx.db.get(input.targetBlockId) : undefined;
  if (
    target &&
    (target.workspaceId !== workspaceId || target.pageId !== input.targetPageId)
  ) {
    throw pageError("INVALID_TARGET", "Destination block is unavailable");
  }
  if (target?._id === block._id) return null;
  const nextParent =
    input.placement === "inside" ? target?._id : target?.parentBlockId;
  if (
    input.placement === "inside" &&
    (!target || !CONTAINER_BLOCK_TYPES.has(target.type))
  ) {
    throw pageError(
      "INVALID_TARGET",
      "The destination block cannot contain children",
    );
  }
  const nextParentBlock = nextParent ? await ctx.db.get(nextParent) : undefined;
  if (block.type === "column" && (!nextParentBlock || nextParentBlock.type !== "columns")) {
    throw pageError(
      "INVALID_COLUMN_PARENT",
      "Columns must stay inside a columns block",
    );
  }
  if (block.type === "synced_reference") {
    await assertSyncedReferenceDestination(ctx, workspaceId, nextParent);
  }
  let ancestorId = nextParent;
  for (let depth = 0; ancestorId && depth < 100; depth += 1) {
    if (ancestorId === block._id) {
      throw pageError(
        "BLOCK_CYCLE",
        "A block cannot move inside itself or its descendants",
      );
    }
    ancestorId = (await ctx.db.get(ancestorId))?.parentBlockId;
  }
  if (ancestorId) {
    throw pageError("BLOCK_DEPTH", "Block nesting is too deep");
  }

  const oldPageId = block.pageId;
  const oldParentBlockId = block.parentBlockId;
  const destination = (
    await pageBlockSiblings(ctx, input.targetPageId, nextParent)
  ).filter((candidate) => candidate._id !== block._id);
  const targetIndex = target
    ? destination.findIndex((candidate) => candidate._id === target._id)
    : destination.length;
  const insertionIndex = target
    ? Math.max(0, targetIndex + (input.placement === "after" ? 1 : 0))
    : destination.length;
  destination.splice(insertionIndex, 0, block);
  const now = Date.now();
  await ctx.db.patch(block._id, {
    pageId: input.targetPageId,
    parentBlockId: nextParent,
    updatedAt: now,
  });

  if (oldPageId !== input.targetPageId) {
    if (block.type === "child_page" && block.linkedPageId) {
      await moveLinkedChildPage(ctx, workspaceId, block.linkedPageId, input.targetPageId);
    }
    const sourceBlocks = await ctx.db
      .query("pageBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", oldPageId))
      .take(2_000);
    const descendants = new Set<string>([block._id]);
    let found = true;
    while (found) {
      found = false;
      for (const candidate of sourceBlocks) {
        if (
          candidate.parentBlockId &&
          descendants.has(candidate.parentBlockId) &&
          !descendants.has(candidate._id)
        ) {
          descendants.add(candidate._id);
          found = true;
        }
      }
    }
    await Promise.all(
      sourceBlocks
        .filter(
          (candidate) =>
            candidate._id !== block._id && descendants.has(candidate._id),
        )
        .map((candidate) =>
          ctx.db.patch(candidate._id, {
            pageId: input.targetPageId,
            updatedAt: now,
          }),
        ),
    );
    await moveSyncGroupSources(ctx, workspaceId, descendants, input.targetPageId);
  }
  await Promise.all(
    destination.map((candidate, order) =>
      ctx.db.patch(candidate._id, { order, updatedAt: now }),
    ),
  );
  if (oldPageId !== input.targetPageId || oldParentBlockId !== nextParent) {
    const previous = (
      await pageBlockSiblings(ctx, oldPageId, oldParentBlockId)
    ).filter((candidate) => candidate._id !== block._id);
    await Promise.all(
      previous.map((candidate, order) =>
        ctx.db.patch(candidate._id, { order, updatedAt: now }),
      ),
    );
  }
  return null;
}
