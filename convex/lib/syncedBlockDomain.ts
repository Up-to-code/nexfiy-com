import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

const CONTAINER_TYPES = new Set<Doc<"pageBlocks">["type"]>([
  "callout",
  "toggle",
  "columns",
  "column",
]);

const syncError = (code: string, message: string) =>
  new ConvexError({ code, message });

async function requireDynamicPage(
  ctx: ReadCtx,
  workspaceId: string,
  pageId: Id<"documents">,
) {
  const page = await ctx.db.get(pageId);
  if (
    !page ||
    page.userId !== workspaceId ||
    page.isArchived ||
    page.kind === "database" ||
    page.contentModel !== "page_blocks"
  ) {
    throw syncError(
      "PAGE_NOT_FOUND",
      "Dynamic page not found in this workspace",
    );
  }
  return page;
}

async function requireWorkspaceBlock(
  ctx: ReadCtx,
  workspaceId: string,
  blockId: Id<"pageBlocks">,
) {
  const block = await ctx.db.get(blockId);
  if (!block || block.workspaceId !== workspaceId) {
    throw syncError("BLOCK_NOT_FOUND", "Block not found in this workspace");
  }
  return block;
}

async function pageBlocks(ctx: ReadCtx, pageId: Id<"documents">) {
  return await ctx.db
    .query("pageBlocks")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .take(2_000);
}

function subtreeIds(
  blocks: Doc<"pageBlocks">[],
  rootBlockId: Id<"pageBlocks">,
) {
  const ids = new Set<string>([rootBlockId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const block of blocks) {
      if (
        block.parentBlockId &&
        ids.has(block.parentBlockId) &&
        !ids.has(block._id)
      ) {
        ids.add(block._id);
        changed = true;
      }
    }
  }
  return ids;
}

function publicBlock(block: Doc<"pageBlocks">) {
  return {
    id: block._id,
    editorId: block.editorId ?? block._id,
    pageId: block.pageId,
    parentBlockId: block.parentBlockId,
    type: block.type,
    order: block.order,
    text: block.text,
    checked: block.checked,
    url: block.url,
    color: block.color,
    propsJson: block.propsJson,
    dataSourceId: block.dataSourceId,
    viewId: block.viewId,
    syncGroupId: block.syncGroupId,
    linkedPageId: block.linkedPageId,
  };
}

async function requireReference(
  ctx: ReadCtx,
  workspaceId: string,
  referenceBlockId: Id<"pageBlocks">,
) {
  const reference = await requireWorkspaceBlock(
    ctx,
    workspaceId,
    referenceBlockId,
  );
  if (reference.type !== "synced_reference" || !reference.syncGroupId) {
    throw syncError("NOT_SYNCED_REFERENCE", "Block is not a synced reference");
  }
  const group = await ctx.db.get(reference.syncGroupId);
  if (!group || group.workspaceId !== workspaceId) {
    throw syncError(
      "SYNC_GROUP_NOT_FOUND",
      "Synced block source is unavailable",
    );
  }
  const sourceRoot = await requireWorkspaceBlock(
    ctx,
    workspaceId,
    group.sourceRootBlockId,
  );
  if (sourceRoot.pageId !== group.sourcePageId) {
    throw syncError("SYNC_SOURCE_INVALID", "Synced block source is invalid");
  }
  return { reference, group, sourceRoot };
}

export async function getSyncedBlockContent(
  ctx: ReadCtx,
  workspaceId: string,
  referenceBlockId: Id<"pageBlocks">,
) {
  const { reference, group } = await requireReference(
    ctx,
    workspaceId,
    referenceBlockId,
  );
  const sourcePageBlocks = await pageBlocks(ctx, group.sourcePageId);
  const sourceIds = subtreeIds(sourcePageBlocks, group.sourceRootBlockId);
  const blocks = sourcePageBlocks
    .filter((block) => sourceIds.has(block._id))
    .sort((left, right) => left.order - right.order)
    .map(publicBlock);
  return {
    groupId: group._id,
    referenceBlockId: reference._id,
    sourcePageId: group.sourcePageId,
    sourceRootBlockId: group.sourceRootBlockId,
    blocks,
  };
}

async function isInsideSyncedSource(
  ctx: ReadCtx,
  workspaceId: string,
  blockId?: Id<"pageBlocks">,
) {
  let currentId = blockId;
  for (let depth = 0; currentId && depth < 100; depth += 1) {
    const block = await requireWorkspaceBlock(ctx, workspaceId, currentId);
    const group = await ctx.db
      .query("syncedBlockGroups")
      .withIndex("by_source_root_block", (q) =>
        q.eq("sourceRootBlockId", block._id),
      )
      .unique();
    if (group?.workspaceId === workspaceId) return true;
    currentId = block.parentBlockId;
  }
  if (currentId) {
    throw syncError("BLOCK_DEPTH_LIMIT", "Block nesting is too deep");
  }
  return false;
}

export async function assertSyncedReferenceDestination(
  ctx: ReadCtx,
  workspaceId: string,
  parentBlockId?: Id<"pageBlocks">,
) {
  if (await isInsideSyncedSource(ctx, workspaceId, parentBlockId)) {
    throw syncError(
      "SYNC_CYCLE",
      "A synced reference cannot be placed inside a canonical synced source",
    );
  }
}

export async function createSyncedBlockReference(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    sourceBlockId: Id<"pageBlocks">;
    targetPageId: Id<"documents">;
    parentBlockId?: Id<"pageBlocks">;
    afterBlockId?: Id<"pageBlocks">;
  },
) {
  const source = await requireWorkspaceBlock(
    ctx,
    workspaceId,
    args.sourceBlockId,
  );
  if (
    source.type === "synced_reference" ||
    source.type === "column" ||
    source.type === "child_page"
  ) {
    throw syncError(
      "INVALID_SYNC_SOURCE",
      "Choose a content or container block as the synced source",
    );
  }
  await requireDynamicPage(ctx, workspaceId, source.pageId);
  const sourcePageBlocks = await pageBlocks(ctx, source.pageId);
  const sourceSubtreeIds = subtreeIds(sourcePageBlocks, source._id);
  if (
    sourcePageBlocks.some(
      (block) => sourceSubtreeIds.has(block._id) && block.type === "child_page",
    )
  ) {
    throw syncError(
      "INVALID_SYNC_SOURCE",
      "A synced block cannot own a sub-page",
    );
  }
  await requireDynamicPage(ctx, workspaceId, args.targetPageId);

  if (args.parentBlockId) {
    const parent = await requireWorkspaceBlock(
      ctx,
      workspaceId,
      args.parentBlockId,
    );
    if (
      parent.pageId !== args.targetPageId ||
      !CONTAINER_TYPES.has(parent.type)
    ) {
      throw syncError(
        "INVALID_SYNC_DESTINATION",
        "Destination block cannot contain a synced reference",
      );
    }
  }
  await assertSyncedReferenceDestination(ctx, workspaceId, args.parentBlockId);

  const siblings = (
    await ctx.db
      .query("pageBlocks")
      .withIndex("by_page_and_parent", (q) =>
        q
          .eq("pageId", args.targetPageId)
          .eq("parentBlockId", args.parentBlockId),
      )
      .take(500)
  ).sort((left, right) => left.order - right.order);
  const afterIndex = args.afterBlockId
    ? siblings.findIndex((block) => block._id === args.afterBlockId)
    : siblings.length - 1;
  if (args.afterBlockId && afterIndex === -1) {
    throw syncError(
      "INVALID_INSERTION_POINT",
      "Insertion point is unavailable",
    );
  }
  const order = Math.max(0, afterIndex + 1);
  const existingGroup = await ctx.db
    .query("syncedBlockGroups")
    .withIndex("by_source_root_block", (q) =>
      q.eq("sourceRootBlockId", source._id),
    )
    .unique();
  if (existingGroup && existingGroup.workspaceId !== workspaceId) {
    throw syncError(
      "SYNC_GROUP_NOT_FOUND",
      "Synced block source is unavailable",
    );
  }
  const now = Date.now();
  const groupId =
    existingGroup?._id ??
    (await ctx.db.insert("syncedBlockGroups", {
      workspaceId,
      sourcePageId: source.pageId,
      sourceRootBlockId: source._id,
      createdAt: now,
      updatedAt: now,
    }));
  const referenceBlockId = await ctx.db.insert("pageBlocks", {
    workspaceId,
    pageId: args.targetPageId,
    parentBlockId: args.parentBlockId,
    type: "synced_reference",
    syncGroupId: groupId,
    order,
    createdAt: now,
    updatedAt: now,
  });
  const reordered = [...siblings];
  reordered.splice(order, 0, (await ctx.db.get(referenceBlockId))!);
  await Promise.all(
    reordered.map((block, index) =>
      ctx.db.patch(block._id, { order: index, updatedAt: now }),
    ),
  );
  return { groupId, referenceBlockId };
}

export async function unlinkSyncedBlockReference(
  ctx: MutationCtx,
  workspaceId: string,
  referenceBlockId: Id<"pageBlocks">,
) {
  const { reference, group } = await requireReference(
    ctx,
    workspaceId,
    referenceBlockId,
  );
  const sourcePageBlocks = await pageBlocks(ctx, group.sourcePageId);
  const sourceIds = subtreeIds(sourcePageBlocks, group.sourceRootBlockId);
  const unresolved = sourcePageBlocks.filter((block) =>
    sourceIds.has(block._id),
  );
  const clonedBySource = new Map<string, Id<"pageBlocks">>();
  const clonedBlockIds: Id<"pageBlocks">[] = [];
  const now = Date.now();
  while (unresolved.length) {
    const index = unresolved.findIndex(
      (block) =>
        block._id === group.sourceRootBlockId ||
        (block.parentBlockId && clonedBySource.has(block.parentBlockId)),
    );
    if (index === -1) {
      throw syncError(
        "INVALID_BLOCK_TREE",
        "Synced source has an invalid block tree",
      );
    }
    const [block] = unresolved.splice(index, 1);
    const isRoot = block._id === group.sourceRootBlockId;
    const blockId = await ctx.db.insert("pageBlocks", {
      workspaceId,
      pageId: reference.pageId,
      parentBlockId: isRoot
        ? reference.parentBlockId
        : clonedBySource.get(block.parentBlockId!),
      type: block.type,
      order: isRoot ? reference.order : block.order,
      text: block.text,
      checked: block.checked,
      url: block.url,
      color: block.color,
      propsJson: block.propsJson,
      dataSourceId: block.dataSourceId,
      viewId: block.viewId,
      syncGroupId: block.syncGroupId,
      linkedPageId: block.linkedPageId,
      createdAt: now,
      updatedAt: now,
    });
    clonedBySource.set(block._id, blockId);
    clonedBlockIds.push(blockId);
  }
  await ctx.db.delete(reference._id);
  return {
    rootBlockId: clonedBySource.get(group.sourceRootBlockId)!,
    blockIds: clonedBlockIds,
  };
}

export async function removeSyncGroupsForSourceBlocks(
  ctx: MutationCtx,
  workspaceId: string,
  removedBlockIds: Set<string>,
) {
  for (const sourceRootBlockId of removedBlockIds) {
    const group = await ctx.db
      .query("syncedBlockGroups")
      .withIndex("by_source_root_block", (q) =>
        q.eq("sourceRootBlockId", sourceRootBlockId as Id<"pageBlocks">),
      )
      .unique();
    if (!group || group.workspaceId !== workspaceId) continue;
    const references = await ctx.db
      .query("pageBlocks")
      .withIndex("by_sync_group", (q) => q.eq("syncGroupId", group._id))
      .take(500);
    await Promise.all(
      references
        .filter((reference) => !removedBlockIds.has(reference._id))
        .map((reference) => ctx.db.delete(reference._id)),
    );
    await ctx.db.delete(group._id);
  }
}

export async function moveSyncGroupSources(
  ctx: MutationCtx,
  workspaceId: string,
  movedBlockIds: Set<string>,
  targetPageId: Id<"documents">,
) {
  for (const sourceRootBlockId of movedBlockIds) {
    const group = await ctx.db
      .query("syncedBlockGroups")
      .withIndex("by_source_root_block", (q) =>
        q.eq("sourceRootBlockId", sourceRootBlockId as Id<"pageBlocks">),
      )
      .unique();
    if (!group || group.workspaceId !== workspaceId) continue;
    await ctx.db.patch(group._id, {
      sourcePageId: targetPageId,
      updatedAt: Date.now(),
    });
  }
}
