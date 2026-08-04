import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getWorkspaceBillingScope,
  getWorkspaceManagementScope,
} from "./lib/workspace";
import { requireProForUser } from "./lib/billingDomain";
import {
  archivePage as archivePageDomain,
  blockBlueprintValidator,
  createBlocks as createBlocksDomain,
  createPage as createPageDomain,
  moveBlock as moveBlockDomain,
  updateBlock as updateBlockDomain,
  updatePage as updatePageDomain,
  type MoveBlockInput,
  type UpdateBlockInput,
  type UpdatePageInput,
} from "./lib/pageWriteDomain";
import {
  canonicalBlockValidator,
  canonicalPageSummaryValidator,
  listCanonicalPropertyValues,
  toCanonicalBlock,
  toCanonicalPageSummary,
} from "./lib/pageContentDomain";

const webhookError = (code: string, message: string) =>
  new ConvexError({ code, message });

const permissionValidator = v.union(
  v.literal("read"),
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("add_blocks"),
);
type WebhookPermission = Doc<"webhookKeys">["permissions"][number];

const webhookKeyViewValidator = v.object({
  _id: v.id("webhookKeys"),
  name: v.string(),
  tokenPrefix: v.string(),
  permissions: v.array(permissionValidator),
  isEnabled: v.boolean(),
  createdAt: v.number(),
});

const documentDetailValidator = v.object({
  ...canonicalPageSummaryValidator.fields,
  blocks: v.array(canonicalBlockValidator),
  blocksTruncated: v.boolean(),
});

const requireUserId = async (ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw webhookError("UNAUTHENTICATED", "Sign in to manage webhook keys");
  }
  return identity.subject;
};

const normalizeTokenHash = (tokenHash: string) => {
  const normalized = tokenHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw webhookError("INVALID_TOKEN", "The webhook token is invalid");
  }
  return normalized;
};

const uniquePermissions = (permissions: WebhookPermission[]) => [
  ...new Set(permissions),
];

async function requireManager(ctx: QueryCtx) {
  const userId = await requireUserId(ctx);
  const scope = await getWorkspaceManagementScope(ctx, userId);
  const billingScope = await getWorkspaceBillingScope(ctx, userId);
  await requireProForUser(ctx, billingScope.billingOwnerId);
  if (!scope.canManage) {
    throw webhookError(
      "FORBIDDEN",
      "Only workspace owners and admins can manage webhook keys",
    );
  }
  return { ...scope, userId, billingOwnerId: billingScope.billingOwnerId };
}

async function getAccess(ctx: QueryCtx, tokenHash: string) {
  const key = await ctx.db
    .query("webhookKeys")
    .withIndex("by_token_hash", (q) =>
      q.eq("tokenHash", normalizeTokenHash(tokenHash)),
    )
    .unique();
  if (!key?.isEnabled) return null;
  await requireProForUser(ctx, key.billingOwnerId ?? key.createdById);
  return key;
}

function requirePermission(key: Doc<"webhookKeys">, permission: WebhookPermission) {
  if (!key.permissions.includes(permission)) {
    throw webhookError(
      "FORBIDDEN",
      `This webhook key does not have the "${permission}" permission`,
    );
  }
}

export const getSettings = query({
  args: {},
  returns: v.object({
    canManage: v.boolean(),
    keys: v.array(webhookKeyViewValidator),
  }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const scope = await getWorkspaceManagementScope(ctx, userId);
    if (!scope.canManage) {
      return { canManage: false, keys: [] };
    }
    const keys = await ctx.db
      .query("webhookKeys")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", scope.workspaceId))
      .order("desc")
      .take(50);
    return {
      canManage: true,
      keys: keys.map((key) => ({
        _id: key._id,
        name: key.name,
        tokenPrefix: key.tokenPrefix,
        permissions: key.permissions,
        isEnabled: key.isEnabled,
        createdAt: key.createdAt,
      })),
    };
  },
});

export const createKey = mutation({
  args: {
    name: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    permissions: v.array(permissionValidator),
  },
  returns: v.id("webhookKeys"),
  handler: async (ctx, args) => {
    const { workspaceId, userId, billingOwnerId } = await requireManager(ctx);
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw webhookError(
        "INVALID_NAME",
        "Webhook key name must contain 1 to 100 characters",
      );
    }
    const permissions = uniquePermissions(args.permissions);
    if (!permissions.length) {
      throw webhookError(
        "INVALID_PERMISSIONS",
        "Select at least one webhook permission",
      );
    }
    const tokenHash = normalizeTokenHash(args.tokenHash);
    const existing = await ctx.db
      .query("webhookKeys")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (existing) {
      throw webhookError("TOKEN_COLLISION", "Generate a new webhook key");
    }
    return await ctx.db.insert("webhookKeys", {
      workspaceId,
      createdById: userId,
      billingOwnerId,
      name,
      tokenHash,
      tokenPrefix: args.tokenPrefix.slice(0, 20),
      permissions,
      isEnabled: true,
      createdAt: Date.now(),
    });
  },
});

export const setKeyPermissions = mutation({
  args: {
    id: v.id("webhookKeys"),
    permissions: v.array(permissionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireManager(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.workspaceId !== workspaceId) {
      throw webhookError("KEY_NOT_FOUND", "Webhook key not found");
    }
    const permissions = uniquePermissions(args.permissions);
    if (!permissions.length) {
      throw webhookError(
        "INVALID_PERMISSIONS",
        "Select at least one webhook permission",
      );
    }
    await ctx.db.patch(args.id, { permissions });
    return null;
  },
});

export const setKeyEnabled = mutation({
  args: { id: v.id("webhookKeys"), isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireManager(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.workspaceId !== workspaceId) {
      throw webhookError("KEY_NOT_FOUND", "Webhook key not found");
    }
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled });
    return null;
  },
});

export const revokeKey = mutation({
  args: { id: v.id("webhookKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireManager(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.workspaceId !== workspaceId) {
      throw webhookError("KEY_NOT_FOUND", "Webhook key not found");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const listDocuments = query({
  args: { tokenHash: v.string() },
  returns: v.object({
    pages: v.array(canonicalPageSummaryValidator),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "read");
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", key.workspaceId))
      .order("desc")
      .take(201);
    const pages = await Promise.all(
      documents
        .filter((document) => !document.isArchived && document.kind !== "database")
        .slice(0, 200)
        .map(async (document) => {
          const values = await listCanonicalPropertyValues(ctx, document._id);
          return toCanonicalPageSummary(document, values);
        }),
    );
    return { pages, truncated: documents.length > 200 };
  },
});

export const getDocument = query({
  args: { tokenHash: v.string(), documentId: v.id("documents") },
  returns: v.union(v.null(), documentDetailValidator),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "read");
    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.userId !== key.workspaceId ||
      document.isArchived ||
      document.kind === "database"
    ) {
      return null;
    }
    const [blocks, values] = await Promise.all([
      ctx.db
        .query("pageBlocks")
        .withIndex("by_page", (q) => q.eq("pageId", document._id))
        .take(1001),
      listCanonicalPropertyValues(ctx, document._id),
    ]);
    return {
      ...toCanonicalPageSummary(document, values),
      blocks: blocks.slice(0, 1000).map(toCanonicalBlock),
      blocksTruncated: blocks.length > 1000,
    };
  },
});

export const createDocument = mutation({
  args: {
    tokenHash: v.string(),
    title: v.string(),
    parentId: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    icon: v.optional(v.string()),
    cover: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    contentModel: v.optional(
      v.union(v.literal("blocknote"), v.literal("page_blocks")),
    ),
  },
  returns: v.object({
    id: v.id("documents"),
    title: v.string(),
    parentId: v.union(v.id("documents"), v.null()),
  }),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "create");
    return await createPageDomain(ctx, key.workspaceId, {
      title: args.title,
      parentId: args.parentId,
      content: args.content,
      icon: args.icon,
      cover: args.cover,
      isPublished: args.isPublished,
      contentModel: args.contentModel,
    });
  },
});

export const updateDocument = mutation({
  args: {
    tokenHash: v.string(),
    documentId: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    icon: v.optional(v.string()),
    cover: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  returns: v.union(v.null(), documentDetailValidator),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "update");
    return await updatePageDomain(ctx, key.workspaceId, args as UpdatePageInput);
  },
});

export const archiveDocument = mutation({
  args: { tokenHash: v.string(), documentId: v.id("documents") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "delete");
    return await archivePageDomain(ctx, key.workspaceId, args.documentId);
  },
});

export const createBlocks = mutation({
  args: {
    tokenHash: v.string(),
    pageId: v.id("documents"),
    blocks: v.array(blockBlueprintValidator),
  },
  returns: v.array(
    v.object({
      key: v.string(),
      id: v.id("pageBlocks"),
      parentBlockId: v.union(v.id("pageBlocks"), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "add_blocks");
    return await createBlocksDomain(ctx, key.workspaceId, args.pageId, args.blocks);
  },
});

export const updateBlock = mutation({
  args: {
    tokenHash: v.string(),
    blockId: v.id("pageBlocks"),
    text: v.optional(v.string()),
    checked: v.optional(v.boolean()),
    url: v.optional(v.string()),
    alt: v.optional(v.string()),
    caption: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "update");
    return await updateBlockDomain(ctx, key.workspaceId, args as UpdateBlockInput);
  },
});

export const moveBlock = mutation({
  args: {
    tokenHash: v.string(),
    blockId: v.id("pageBlocks"),
    targetPageId: v.id("documents"),
    targetBlockId: v.optional(v.id("pageBlocks")),
    placement: v.union(
      v.literal("before"),
      v.literal("after"),
      v.literal("inside"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await getAccess(ctx, args.tokenHash);
    if (!key) {
      throw webhookError("UNAUTHORIZED", "Webhook key is unavailable");
    }
    requirePermission(key, "update");
    return await moveBlockDomain(ctx, key.workspaceId, args as MoveBlockInput);
  },
});
