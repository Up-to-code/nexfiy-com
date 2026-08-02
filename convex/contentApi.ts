import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getWorkspaceBillingScope,
  getWorkspaceManagementScope,
} from "./lib/workspace";
import { requireProForUser } from "./lib/billingDomain";

const contentApiError = (code: string, message: string) =>
  new ConvexError({ code, message });

const requireUserId = async (ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw contentApiError(
      "UNAUTHENTICATED",
      "Sign in to manage Content API access",
    );
  }
  return identity.subject;
};

const normalizeTokenHash = (tokenHash: string) => {
  const normalized = tokenHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw contentApiError("INVALID_TOKEN", "The Content API token is invalid");
  }
  return normalized;
};

const getKeyByTokenHash = async (
  ctx: { db: QueryCtx["db"] },
  tokenHash: string,
) => {
  const key = await ctx.db
    .query("contentApiKeys")
    .withIndex("by_token_hash", (q) =>
      q.eq("tokenHash", normalizeTokenHash(tokenHash)),
    )
    .unique();
  if (!key?.isEnabled) return null;
  await requireProForUser(
    ctx as QueryCtx,
    key.billingOwnerId ?? key.createdById,
  );
  return key;
};

const sourceValidator = v.object({
  id: v.id("dataSources"),
  documentId: v.id("documents"),
  name: v.string(),
  icon: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

const keyValidator = v.object({
  _id: v.id("contentApiKeys"),
  name: v.string(),
  tokenPrefix: v.string(),
  dataSourceIds: v.array(v.id("dataSources")),
  isEnabled: v.boolean(),
  createdAt: v.number(),
});

const propertyTypeValidator = v.union(
  v.literal("title"),
  v.literal("text"),
  v.literal("number"),
  v.literal("select"),
  v.literal("multi_select"),
  v.literal("status"),
  v.literal("date"),
  v.literal("checkbox"),
  v.literal("url"),
  v.literal("relation"),
  v.literal("rollup"),
  v.literal("formula"),
);

const propertyValidator = v.object({
  id: v.id("databaseProperties"),
  name: v.string(),
  type: propertyTypeValidator,
  order: v.number(),
  options: v.array(
    v.object({
      id: v.id("databaseSelectOptions"),
      name: v.string(),
      color: v.string(),
      order: v.number(),
    }),
  ),
});

const valueValidator = v.object({
  propertyId: v.id("databaseProperties"),
  type: v.string(),
  text: v.union(v.string(), v.null()),
  number: v.union(v.number(), v.null()),
  boolean: v.union(v.boolean(), v.null()),
  dateStart: v.union(v.number(), v.null()),
  dateEnd: v.union(v.number(), v.null()),
  optionIds: v.array(v.id("databaseSelectOptions")),
});

const contentItemValidator = v.object({
  id: v.id("documents"),
  title: v.string(),
  icon: v.union(v.string(), v.null()),
  updatedAt: v.union(v.number(), v.null()),
  values: v.array(valueValidator),
});

const blockValidator = v.object({
  id: v.id("pageBlocks"),
  editorId: v.union(v.string(), v.null()),
  parentBlockId: v.union(v.id("pageBlocks"), v.null()),
  type: v.string(),
  order: v.number(),
  text: v.union(v.string(), v.null()),
  checked: v.union(v.boolean(), v.null()),
  url: v.union(v.string(), v.null()),
  color: v.union(v.string(), v.null()),
  propsJson: v.union(v.string(), v.null()),
  dataSourceId: v.union(v.id("dataSources"), v.null()),
  viewId: v.union(v.id("databaseViews"), v.null()),
  linkedContentId: v.union(v.id("documents"), v.null()),
  syncGroupId: v.union(v.id("syncedBlockGroups"), v.null()),
});

const uniqueSourceIds = (dataSourceIds: Id<"dataSources">[]) => [
  ...new Set(dataSourceIds),
];

async function requireManager(ctx: QueryCtx) {
  const userId = await requireUserId(ctx);
  const scope = await getWorkspaceManagementScope(ctx, userId);
  const billingScope = await getWorkspaceBillingScope(ctx, userId);
  await requireProForUser(ctx, billingScope.billingOwnerId);
  if (!scope.canManage) {
    throw contentApiError(
      "FORBIDDEN",
      "Only workspace owners and admins can manage Content API access",
    );
  }
  return { ...scope, userId, billingOwnerId: billingScope.billingOwnerId };
}

async function listWorkspaceSources(ctx: QueryCtx, workspaceId: string) {
  const sources = await ctx.db
    .query("dataSources")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(100);
  const available = [];
  for (const source of sources) {
    const document = await ctx.db.get(source.databaseDocumentId);
    if (!document || document.userId !== workspaceId || document.isArchived) {
      continue;
    }
    available.push({
      id: source._id,
      documentId: source.databaseDocumentId,
      name: source.name,
      icon: document.icon ?? null,
      updatedAt: source.updatedAt,
    });
  }
  return available.sort((left, right) => right.updatedAt - left.updatedAt);
}

async function validateSelectedSources(
  ctx: QueryCtx,
  workspaceId: string,
  requestedIds: Id<"dataSources">[],
) {
  const dataSourceIds = uniqueSourceIds(requestedIds);
  if (dataSourceIds.length === 0 || dataSourceIds.length > 100) {
    throw contentApiError(
      "INVALID_SOURCES",
      "Select between 1 and 100 databases",
    );
  }
  for (const dataSourceId of dataSourceIds) {
    const source = await ctx.db.get(dataSourceId);
    const document = source
      ? await ctx.db.get(source.databaseDocumentId)
      : null;
    if (
      !source ||
      source.workspaceId !== workspaceId ||
      !document ||
      document.userId !== workspaceId ||
      document.isArchived
    ) {
      throw contentApiError(
        "SOURCE_NOT_FOUND",
        "A selected database is unavailable in this workspace",
      );
    }
  }
  return dataSourceIds;
}

export const getSettings = query({
  args: {},
  returns: v.object({
    canManage: v.boolean(),
    sources: v.array(sourceValidator),
    keys: v.array(keyValidator),
  }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const scope = await getWorkspaceManagementScope(ctx, userId);
    if (!scope.canManage) {
      return { canManage: false, sources: [], keys: [] };
    }
    const [sources, keys] = await Promise.all([
      listWorkspaceSources(ctx, scope.workspaceId),
      ctx.db
        .query("contentApiKeys")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", scope.workspaceId),
        )
        .order("desc")
        .take(50),
    ]);
    return {
      canManage: true,
      sources,
      keys: keys.map((key) => ({
        _id: key._id,
        name: key.name,
        tokenPrefix: key.tokenPrefix,
        dataSourceIds: key.dataSourceIds,
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
    dataSourceIds: v.array(v.id("dataSources")),
  },
  returns: v.id("contentApiKeys"),
  handler: async (ctx, args) => {
    const { workspaceId, userId, billingOwnerId } = await requireManager(ctx);
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw contentApiError(
        "INVALID_NAME",
        "Key name must contain 1 to 100 characters",
      );
    }
    const tokenHash = normalizeTokenHash(args.tokenHash);
    const existing = await ctx.db
      .query("contentApiKeys")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (existing) {
      throw contentApiError(
        "TOKEN_COLLISION",
        "Generate a new Content API key",
      );
    }
    const dataSourceIds = await validateSelectedSources(
      ctx,
      workspaceId,
      args.dataSourceIds,
    );
    return await ctx.db.insert("contentApiKeys", {
      workspaceId,
      createdById: userId,
      billingOwnerId,
      name,
      tokenHash,
      tokenPrefix: args.tokenPrefix.slice(0, 20),
      dataSourceIds,
      isEnabled: true,
      createdAt: Date.now(),
    });
  },
});

export const updateKeySources = mutation({
  args: {
    id: v.id("contentApiKeys"),
    dataSourceIds: v.array(v.id("dataSources")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireManager(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.workspaceId !== workspaceId) {
      throw contentApiError("KEY_NOT_FOUND", "Content API key not found");
    }
    const dataSourceIds = await validateSelectedSources(
      ctx,
      workspaceId,
      args.dataSourceIds,
    );
    await ctx.db.patch(args.id, { dataSourceIds });
    return null;
  },
});

export const setKeyEnabled = mutation({
  args: { id: v.id("contentApiKeys"), isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireManager(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.workspaceId !== workspaceId) {
      throw contentApiError("KEY_NOT_FOUND", "Content API key not found");
    }
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled });
    return null;
  },
});

export const revokeKey = mutation({
  args: { id: v.id("contentApiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireManager(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.workspaceId !== workspaceId) {
      throw contentApiError("KEY_NOT_FOUND", "Content API key not found");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const listSources = query({
  args: { tokenHash: v.string() },
  returns: v.array(sourceValidator),
  handler: async (ctx, args) => {
    const key = await getKeyByTokenHash(ctx, args.tokenHash);
    if (!key) {
      throw contentApiError("UNAUTHORIZED", "Content API key is unavailable");
    }
    const sources = await listWorkspaceSources(ctx, key.workspaceId);
    const allowedIds = new Set(key.dataSourceIds);
    return sources.filter((source) => allowedIds.has(source.id));
  },
});

export const getContent = query({
  args: {
    tokenHash: v.string(),
    dataSourceId: v.id("dataSources"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.union(
    v.null(),
    v.object({
      source: sourceValidator,
      properties: v.array(propertyValidator),
      items: paginationResultValidator(contentItemValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const key = await getKeyByTokenHash(ctx, args.tokenHash);
    if (!key) {
      throw contentApiError("UNAUTHORIZED", "Content API key is unavailable");
    }
    if (!key.dataSourceIds.some((id) => id === args.dataSourceId)) return null;

    const source = await ctx.db.get(args.dataSourceId);
    const databaseDocument = source
      ? await ctx.db.get(source.databaseDocumentId)
      : null;
    if (
      !source ||
      source.workspaceId !== key.workspaceId ||
      !databaseDocument ||
      databaseDocument.userId !== key.workspaceId ||
      databaseDocument.isArchived
    ) {
      return null;
    }

    const [properties, options, items] = await Promise.all([
      ctx.db
        .query("databaseProperties")
        .withIndex("by_data_source", (q) => q.eq("dataSourceId", source._id))
        .take(100),
      ctx.db
        .query("databaseSelectOptions")
        .withIndex("by_data_source", (q) => q.eq("dataSourceId", source._id))
        .take(500),
      ctx.db
        .query("documents")
        .withIndex("by_user_and_data_source_and_archived", (q) =>
          q
            .eq("userId", key.workspaceId)
            .eq("dataSourceId", source._id)
            .eq("isArchived", false),
        )
        .paginate(args.paginationOpts),
    ]);

    const itemsWithValues = await Promise.all(
      items.page.map(async (item) => {
        const values = await ctx.db
          .query("databasePropertyValues")
          .withIndex("by_document", (q) => q.eq("documentId", item._id))
          .take(100);
        return {
          id: item._id,
          title: item.title,
          icon: item.icon ?? null,
          updatedAt: item.updatedAt ?? null,
          values: values.map((value) => ({
            propertyId: value.propertyId,
            type: value.type,
            text: value.textValue ?? null,
            number: value.numberValue ?? null,
            boolean: value.booleanValue ?? null,
            dateStart: value.dateStart ?? null,
            dateEnd: value.dateEnd ?? null,
            optionIds: value.optionIds ?? [],
          })),
        };
      }),
    );

    const optionsByProperty = new Map<
      Id<"databaseProperties">,
      Doc<"databaseSelectOptions">[]
    >();
    for (const option of options) {
      const list = optionsByProperty.get(option.propertyId) ?? [];
      list.push(option);
      optionsByProperty.set(option.propertyId, list);
    }

    return {
      source: {
        id: source._id,
        documentId: source.databaseDocumentId,
        name: source.name,
        icon: databaseDocument.icon ?? null,
        updatedAt: source.updatedAt,
      },
      properties: properties
        .sort((left, right) => left.order - right.order)
        .map((property) => ({
          id: property._id,
          name: property.name,
          type: property.type,
          order: property.order,
          options: (optionsByProperty.get(property._id) ?? [])
            .sort((left, right) => left.order - right.order)
            .map((option) => ({
              id: option._id,
              name: option.name,
              color: option.color,
              order: option.order,
            })),
        })),
      items: { ...items, page: itemsWithValues },
    };
  },
});

export const getContentItem = query({
  args: {
    tokenHash: v.string(),
    dataSourceId: v.id("dataSources"),
    contentId: v.id("documents"),
  },
  returns: v.union(
    v.null(),
    v.object({
      source: sourceValidator,
      item: v.object({
        id: v.id("documents"),
        title: v.string(),
        icon: v.union(v.string(), v.null()),
        updatedAt: v.union(v.number(), v.null()),
        content: v.union(v.string(), v.null()),
        contentModel: v.union(
          v.literal("blocknote"),
          v.literal("page_blocks"),
          v.null(),
        ),
        blocks: v.array(blockValidator),
        blocksTruncated: v.boolean(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const key = await getKeyByTokenHash(ctx, args.tokenHash);
    if (!key) {
      throw contentApiError("UNAUTHORIZED", "Content API key is unavailable");
    }
    if (!key.dataSourceIds.some((id) => id === args.dataSourceId)) return null;

    const [source, item] = await Promise.all([
      ctx.db.get(args.dataSourceId),
      ctx.db.get(args.contentId),
    ]);
    if (
      !source ||
      source.workspaceId !== key.workspaceId ||
      !item ||
      item.userId !== key.workspaceId ||
      item.dataSourceId !== source._id ||
      item.isArchived
    ) {
      return null;
    }
    const databaseDocument = await ctx.db.get(source.databaseDocumentId);
    if (
      !databaseDocument ||
      databaseDocument.userId !== key.workspaceId ||
      databaseDocument.isArchived
    ) {
      return null;
    }
    const blocks = await ctx.db
      .query("pageBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", item._id))
      .take(1001);

    return {
      source: {
        id: source._id,
        documentId: source.databaseDocumentId,
        name: source.name,
        icon: databaseDocument.icon ?? null,
        updatedAt: source.updatedAt,
      },
      item: {
        id: item._id,
        title: item.title,
        icon: item.icon ?? null,
        updatedAt: item.updatedAt ?? null,
        content: item.content ?? null,
        contentModel: item.contentModel ?? null,
        blocks: blocks.slice(0, 1000).map((block) => ({
          id: block._id,
          editorId: block.editorId ?? null,
          parentBlockId: block.parentBlockId ?? null,
          type: block.type,
          order: block.order,
          text: block.text ?? null,
          checked: block.checked ?? null,
          url: block.url ?? null,
          color: block.color ?? null,
          propsJson: block.propsJson ?? null,
          dataSourceId: block.dataSourceId ?? null,
          viewId: block.viewId ?? null,
          linkedContentId: block.linkedPageId ?? null,
          syncGroupId: block.syncGroupId ?? null,
        })),
        blocksTruncated: blocks.length > 1000,
      },
    };
  },
});
