import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const MAX_SIBLINGS = 500;

function childPageError(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function blockSiblings(
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
      .take(MAX_SIBLINGS)
  ).sort((left, right) => left.order - right.order);
}

export async function createChildPageBlock(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    pageId: Id<"documents">;
    parentBlockId?: Id<"pageBlocks">;
    afterBlockId?: Id<"pageBlocks">;
    replaceBlockId?: Id<"pageBlocks">;
    title?: string;
    operationId: string;
  },
) {
  const operationId = args.operationId.trim();
  if (!operationId || operationId.length > 100) {
    childPageError(
      "INVALID_OPERATION_ID",
      "Operation ID must contain between 1 and 100 characters",
    );
  }
  const replay = await ctx.db
    .query("pageBlocks")
    .withIndex("by_workspace_and_creation_operation", (q) =>
      q.eq("workspaceId", workspaceId).eq("creationOperationId", operationId),
    )
    .first();
  if (replay?.type === "child_page" && replay.linkedPageId) {
    const linkedPage = await ctx.db.get(replay.linkedPageId);
    if (linkedPage && linkedPage.userId === workspaceId) {
      return { blockId: replay._id, pageId: linkedPage._id };
    }
  }

  const parentPage = await ctx.db.get(args.pageId);
  if (
    !parentPage ||
    parentPage.userId !== workspaceId ||
    parentPage.isArchived ||
    parentPage.kind === "database" ||
    parentPage.contentModel !== "page_blocks"
  ) {
    childPageError(
      "PARENT_PAGE_NOT_FOUND",
      "The parent page is unavailable or does not use dynamic blocks",
    );
  }

  let parentBlockId = args.parentBlockId;
  let afterBlockId = args.afterBlockId;
  let replacement: Doc<"pageBlocks"> | null = null;
  if (args.replaceBlockId) {
    replacement = await ctx.db.get(args.replaceBlockId);
    if (
      !replacement ||
      replacement.workspaceId !== workspaceId ||
      replacement.pageId !== args.pageId ||
      replacement.type !== "paragraph" ||
      replacement.text?.trim()
    ) {
      childPageError(
        "BLOCK_NOT_EMPTY_PARAGRAPH",
        "A slash command can only replace an empty paragraph",
      );
    }
    const child = await ctx.db
      .query("pageBlocks")
      .withIndex("by_page_and_parent", (q) =>
        q.eq("pageId", args.pageId).eq("parentBlockId", args.replaceBlockId),
      )
      .first();
    if (child) {
      childPageError(
        "BLOCK_HAS_CHILDREN",
        "A paragraph with child blocks cannot become a sub-page",
      );
    }
    parentBlockId = replacement.parentBlockId;
    afterBlockId = undefined;
  }

  if (parentBlockId) {
    const parentBlock = await ctx.db.get(parentBlockId);
    if (
      !parentBlock ||
      parentBlock.workspaceId !== workspaceId ||
      parentBlock.pageId !== args.pageId ||
      !["callout", "toggle", "columns", "column"].includes(parentBlock.type)
    ) {
      childPageError(
        "INVALID_PARENT_BLOCK",
        "The destination block cannot contain a sub-page",
      );
    }
  }

  const siblings = await blockSiblings(ctx, args.pageId, parentBlockId);
  if (!replacement && siblings.length >= MAX_SIBLINGS) {
    childPageError(
      "BLOCK_LIMIT_REACHED",
      "This block container has reached its limit",
    );
  }
  const afterIndex = afterBlockId
    ? siblings.findIndex((block) => block._id === afterBlockId)
    : siblings.length - 1;
  if (afterBlockId && afterIndex === -1) {
    childPageError("INSERTION_POINT_NOT_FOUND", "Insertion point is unavailable");
  }
  const insertionIndex = replacement
    ? siblings.findIndex((block) => block._id === replacement!._id)
    : Math.max(0, afterIndex + 1);
  if (insertionIndex < 0) {
    childPageError("INSERTION_POINT_NOT_FOUND", "Insertion point is unavailable");
  }

  const title = args.title?.trim().slice(0, 200) || "Untitled";
  const pageSiblings = await ctx.db
    .query("documents")
    .withIndex("by_user_parent", (q) =>
      q.eq("userId", workspaceId).eq("parentDocument", args.pageId),
    )
    .take(MAX_SIBLINGS);
  if (pageSiblings.length >= MAX_SIBLINGS) {
    childPageError("PAGE_LIMIT_REACHED", "This page has reached its sub-page limit");
  }
  const now = Date.now();
  const childPageId = await ctx.db.insert("documents", {
    title,
    userId: workspaceId,
    parentDocument: args.pageId,
    order: pageSiblings.length,
    fullWidth: true,
    showToc: true,
    isArchived: false,
    isPublished: false,
    contentModel: "page_blocks",
    kind: "page",
    updatedAt: now,
  });
  await ctx.db.insert("pageBlocks", {
    workspaceId,
    pageId: childPageId,
    type: "paragraph",
    order: 0,
    text: "",
    createdAt: now,
    updatedAt: now,
  });

  let blockId: Id<"pageBlocks">;
  if (replacement) {
    blockId = replacement._id;
    await ctx.db.patch(blockId, {
      type: "child_page",
      text: undefined,
      checked: undefined,
      url: undefined,
      color: undefined,
      propsJson: undefined,
      dataSourceId: undefined,
      viewId: undefined,
      syncGroupId: undefined,
      linkedPageId: childPageId,
      creationOperationId: operationId,
      updatedAt: now,
    });
  } else {
    blockId = await ctx.db.insert("pageBlocks", {
      workspaceId,
      pageId: args.pageId,
      parentBlockId,
      type: "child_page",
      order: insertionIndex,
      linkedPageId: childPageId,
      creationOperationId: operationId,
      createdAt: now,
      updatedAt: now,
    });
    siblings.splice(insertionIndex, 0, (await ctx.db.get(blockId))!);
    await Promise.all(
      siblings.map((block, order) =>
        ctx.db.patch(block._id, { order, updatedAt: now }),
      ),
    );
  }
  return { blockId, pageId: childPageId };
}

export async function moveLinkedChildPage(
  ctx: MutationCtx,
  workspaceId: string,
  linkedPageId: Id<"documents">,
  nextParentPageId: Id<"documents">,
) {
  const linkedPage = await ctx.db.get(linkedPageId);
  if (!linkedPage || linkedPage.userId !== workspaceId || linkedPage.isArchived) {
    childPageError("CHILD_PAGE_NOT_FOUND", "The linked sub-page is unavailable");
  }
  let ancestorId: Id<"documents"> | undefined = nextParentPageId;
  for (let depth = 0; ancestorId && depth < 100; depth += 1) {
    if (ancestorId === linkedPageId) {
      childPageError(
        "PAGE_CYCLE",
        "A sub-page cannot be moved beneath itself or one of its descendants",
      );
    }
    const ancestor: Doc<"documents"> | null = await ctx.db.get(ancestorId);
    if (!ancestor || ancestor.userId !== workspaceId) {
      childPageError("PARENT_PAGE_NOT_FOUND", "The destination page is unavailable");
    }
    ancestorId = ancestor.parentDocument;
  }
  if (ancestorId) {
    childPageError("PAGE_DEPTH_LIMIT", "The page hierarchy is too deep");
  }
  const siblings = await ctx.db
    .query("documents")
    .withIndex("by_user_parent", (q) =>
      q.eq("userId", workspaceId).eq("parentDocument", nextParentPageId),
    )
    .take(MAX_SIBLINGS);
  if (
    siblings.length >= MAX_SIBLINGS &&
    !siblings.some((page) => page._id === linkedPageId)
  ) {
    childPageError(
      "PAGE_LIMIT_REACHED",
      "The destination page has reached its sub-page limit",
    );
  }
  await ctx.db.patch(linkedPageId, {
    parentDocument: nextParentPageId,
    order: siblings.filter((page) => page._id !== linkedPageId).length,
    updatedAt: Date.now(),
  });
}

export async function archiveLinkedChildPage(
  ctx: MutationCtx,
  workspaceId: string,
  rootPageId: Id<"documents">,
) {
  const pending = [rootPageId];
  const archived = new Set<string>();
  while (pending.length) {
    const pageId = pending.shift()!;
    if (archived.has(pageId)) continue;
    if (archived.size >= 2_000) {
      childPageError(
        "PAGE_TREE_LIMIT",
        "The sub-page tree is too large to archive in one operation",
      );
    }
    const page = await ctx.db.get(pageId);
    if (!page || page.userId !== workspaceId) continue;
    archived.add(pageId);
    const children = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", workspaceId).eq("parentDocument", pageId),
      )
      .take(MAX_SIBLINGS);
    pending.push(...children.map((child) => child._id));
  }
  const now = Date.now();
  await Promise.all(
    [...archived].map((pageId) =>
      ctx.db.patch(pageId as Id<"documents">, {
        isArchived: true,
        updatedAt: now,
      }),
    ),
  );
}
