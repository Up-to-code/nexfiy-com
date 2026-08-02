import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const CONTINUING_BLOCK_TYPES = new Set<Doc<"pageBlocks">["type"]>([
  "bulleted_list",
  "numbered_list",
  "checklist",
]);

const EDITABLE_BLOCK_TYPES = new Set<Doc<"pageBlocks">["type"]>([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list",
  "numbered_list",
  "checklist",
  "quote",
  "callout",
  "toggle",
]);

const editError = (code: string, message: string) =>
  new ConvexError({ code, message });

async function siblingBlocks(
  ctx: MutationCtx,
  pageId: Id<"documents">,
  parentBlockId?: Id<"pageBlocks">,
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

export async function splitPageBlockAtCaret(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    blockId: Id<"pageBlocks">;
    text: string;
    cursorOffset: number;
    operationId: string;
  },
) {
  const block = await ctx.db.get(args.blockId);
  if (!block || block.workspaceId !== workspaceId) {
    throw editError("BLOCK_NOT_FOUND", "Block not found in this workspace");
  }
  if (!args.operationId || args.operationId.length > 100) {
    throw editError(
      "INVALID_OPERATION_ID",
      "The split operation identifier is invalid",
    );
  }
  if (
    block.lastSplitOperationId === args.operationId &&
    block.lastSplitResultBlockId
  ) {
    const previousResult = await ctx.db.get(block.lastSplitResultBlockId);
    if (previousResult?.workspaceId === workspaceId) {
      return {
        focusBlockId: previousResult._id,
        action:
          previousResult._id === block._id
            ? ("normalized" as const)
            : ("split" as const),
      };
    }
  }
  if (!EDITABLE_BLOCK_TYPES.has(block.type)) {
    throw editError("BLOCK_NOT_EDITABLE", "This block cannot be split as text");
  }
  if (
    args.text.length > 50_000 ||
    !Number.isInteger(args.cursorOffset) ||
    args.cursorOffset < 0 ||
    args.cursorOffset > args.text.length
  ) {
    throw editError(
      "INVALID_SPLIT_POSITION",
      "The text split position is invalid",
    );
  }

  const firstChild = await ctx.db
    .query("pageBlocks")
    .withIndex("by_page_and_parent", (q) =>
      q.eq("pageId", block.pageId).eq("parentBlockId", block._id),
    )
    .first();
  const now = Date.now();
  if (!args.text.length && block.type !== "paragraph" && !firstChild) {
    await ctx.db.patch(block._id, {
      type: "paragraph",
      text: "",
      checked: undefined,
      color: undefined,
      propsJson: undefined,
      lastSplitOperationId: args.operationId,
      lastSplitResultBlockId: block._id,
      updatedAt: now,
    });
    return { focusBlockId: block._id, action: "normalized" as const };
  }

  const currentSiblings = await siblingBlocks(
    ctx,
    block.pageId,
    block.parentBlockId,
  );
  if (currentSiblings.length >= 500) {
    throw editError(
      "BLOCK_CONTAINER_LIMIT",
      "This block container has reached its limit",
    );
  }
  const currentIndex = currentSiblings.findIndex(
    (candidate) => candidate._id === block._id,
  );
  if (currentIndex === -1) {
    throw editError(
      "BLOCK_ORDER_INVALID",
      "The block insertion point is unavailable",
    );
  }

  const nextType = CONTINUING_BLOCK_TYPES.has(block.type)
    ? block.type
    : "paragraph";
  const nextBlockId = await ctx.db.insert("pageBlocks", {
    workspaceId,
    pageId: block.pageId,
    parentBlockId: block.parentBlockId,
    type: nextType,
    order: currentIndex + 1,
    text: args.text.slice(args.cursorOffset),
    checked: nextType === "checklist" ? false : undefined,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(block._id, {
    text: args.text.slice(0, args.cursorOffset),
    lastSplitOperationId: args.operationId,
    lastSplitResultBlockId: nextBlockId,
    updatedAt: now,
  });
  const reordered = [...currentSiblings];
  reordered.splice(currentIndex + 1, 0, (await ctx.db.get(nextBlockId))!);
  await Promise.all(
    reordered.map((candidate, order) =>
      ctx.db.patch(candidate._id, { order, updatedAt: now }),
    ),
  );
  return { focusBlockId: nextBlockId, action: "split" as const };
}
