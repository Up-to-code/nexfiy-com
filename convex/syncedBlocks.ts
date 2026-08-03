import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  createSyncedBlockReference,
  getSyncedBlockContent,
  unlinkSyncedBlockReference,
} from "./lib/syncedBlockDomain";
import { getWorkspaceScope } from "./lib/workspace";

const blockTypeValidator = v.union(
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

const syncedBlockValidator = v.object({
  id: v.id("pageBlocks"),
  editorId: v.string(),
  pageId: v.id("documents"),
  parentBlockId: v.optional(v.id("pageBlocks")),
  type: blockTypeValidator,
  order: v.number(),
  text: v.optional(v.string()),
  checked: v.optional(v.boolean()),
  url: v.optional(v.string()),
  alt: v.optional(v.string()),
  caption: v.optional(v.string()),
  color: v.optional(v.string()),
  propsJson: v.optional(v.string()),
  dataSourceId: v.optional(v.id("dataSources")),
  viewId: v.optional(v.id("databaseViews")),
  syncGroupId: v.optional(v.id("syncedBlockGroups")),
  linkedPageId: v.optional(v.id("documents")),
});

async function requireWorkspaceId(
  ctx: Parameters<typeof getWorkspaceScope>[0],
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in to manage synced blocks",
    });
  }
  return await getWorkspaceScope(ctx, identity.subject);
}

export const getByReference = query({
  args: { referenceBlockId: v.id("pageBlocks") },
  returns: v.object({
    groupId: v.id("syncedBlockGroups"),
    referenceBlockId: v.id("pageBlocks"),
    sourcePageId: v.id("documents"),
    sourceRootBlockId: v.id("pageBlocks"),
    blocks: v.array(syncedBlockValidator),
  }),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await getSyncedBlockContent(ctx, workspaceId, args.referenceBlockId);
  },
});

export const createReference = mutation({
  args: {
    sourceBlockId: v.id("pageBlocks"),
    targetPageId: v.id("documents"),
    parentBlockId: v.optional(v.id("pageBlocks")),
    afterBlockId: v.optional(v.id("pageBlocks")),
  },
  returns: v.object({
    groupId: v.id("syncedBlockGroups"),
    referenceBlockId: v.id("pageBlocks"),
  }),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await createSyncedBlockReference(ctx, workspaceId, args);
  },
});

export const unlink = mutation({
  args: { referenceBlockId: v.id("pageBlocks") },
  returns: v.object({
    rootBlockId: v.id("pageBlocks"),
    blockIds: v.array(v.id("pageBlocks")),
  }),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await unlinkSyncedBlockReference(
      ctx,
      workspaceId,
      args.referenceBlockId,
    );
  },
});

export const listTargetPages = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("documents"),
      title: v.string(),
      icon: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const workspaceId = await requireWorkspaceId(ctx);
    const pages = await ctx.db
      .query("documents")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", workspaceId).eq("isArchived", false),
      )
      .order("desc")
      .take(200);
    return pages
      .filter(
        (page) =>
          !page.dataSourceId &&
          page.kind !== "database" &&
          page.contentModel === "page_blocks",
      )
      .map((page) => ({ id: page._id, title: page.title, icon: page.icon }));
  },
});
