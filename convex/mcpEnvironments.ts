import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  addDatabaseRow as addDatabaseRowDomain,
  createDatabase as createDatabaseDomain,
  createReciprocalRelationProperty,
  databaseError,
  getDatabaseSnapshot,
  requireDatabaseProperty,
  requireDataSource,
  setDatabaseRelationTargets,
  setDatabasePropertyValue,
  updateDatabaseProperty,
} from "./lib/databaseDomain";
import { serializeViewFilters } from "./lib/databaseViewEngine";
import { compileFormulaExpression } from "./lib/formulaEngine";
import { splitPageBlockAtCaret } from "./lib/pageBlockEditingDomain";
import { createChildPageBlock } from "./lib/childPageDomain";
import {
  createPageTemplateFromPage,
  instantiatePageTemplate,
  listPageTemplates,
} from "./lib/pageTemplateDomain";
import {
  createSyncedBlockReference,
  getSyncedBlockContent,
  unlinkSyncedBlockReference,
} from "./lib/syncedBlockDomain";
import { getWorkspaceBillingScope } from "./lib/workspace";
import { requireProForUser } from "./lib/billingDomain";
import {
  canonicalBlockValidator,
  canonicalPageSummaryValidator,
  listCanonicalPropertyValues,
  toCanonicalBlock,
  toCanonicalPageSummary,
} from "./lib/pageContentDomain";
import {
  archivePage as archivePageDomain,
  blockBlueprintValidator,
  createBlocks as createBlocksDomain,
  createPage as createPageDomain,
  moveBlock as moveBlockDomain,
  pageBlockTypeValidator,
  updateBlock as updateBlockDomain,
  updatePage as updatePageDomain,
  type MoveBlockInput,
  type UpdateBlockInput,
  type UpdatePageInput,
} from "./lib/pageWriteDomain";

const environmentViewValidator = v.object({
  _id: v.id("mcpEnvironments"),
  _creationTime: v.number(),
  name: v.string(),
  tokenPrefix: v.string(),
  isEnabled: v.boolean(),
  lastConnectedAt: v.optional(v.number()),
  lastClientName: v.optional(v.string()),
});

const documentSummaryValidator = canonicalPageSummaryValidator;

const documentDetailValidator = v.object({
  ...canonicalPageSummaryValidator.fields,
  blocks: v.array(canonicalBlockValidator),
  blocksTruncated: v.boolean(),
});

const accessValidator = v.union(
  v.null(),
  v.object({
    environmentId: v.id("mcpEnvironments"),
    environmentName: v.string(),
    workspaceId: v.string(),
  }),
);

const mcpError = (code: string, message: string) =>
  new ConvexError({ code, message });

const requireUserId = async (ctx: {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
}) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw mcpError("UNAUTHENTICATED", "Sign in to manage MCP environments");
  }
  return identity.subject;
};

const normalizeTokenHash = (tokenHash: string) => {
  const normalized = tokenHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw mcpError("INVALID_TOKEN", "The MCP environment token is invalid");
  }
  return normalized;
};

const getEnvironmentByTokenHash = async (
  ctx: { db: QueryCtx["db"] },
  tokenHash: string,
) => {
  const environment = await ctx.db
    .query("mcpEnvironments")
    .withIndex("by_token_hash", (q) =>
      q.eq("tokenHash", normalizeTokenHash(tokenHash)),
    )
    .unique();

  if (!environment?.isEnabled) return null;
  await requireProForUser(
    ctx as QueryCtx,
    environment.billingOwnerId ?? environment.ownerId,
  );
  return environment;
};

const workspacePageValidator = v.object({
  key: v.string(),
  parentKey: v.optional(v.string()),
  title: v.string(),
  content: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPublished: v.optional(v.boolean()),
  contentModel: v.optional(
    v.union(v.literal("blocknote"), v.literal("page_blocks")),
  ),
});

const createdPageValidator = v.object({
  key: v.string(),
  id: v.id("documents"),
  title: v.string(),
  parentId: v.union(v.id("documents"), v.null()),
});

const templateSummaryValidator = v.object({
  id: v.id("pageTemplates"),
  name: v.string(),
  description: v.optional(v.string()),
  icon: v.optional(v.string()),
  pageCount: v.number(),
  blockCount: v.number(),
  updatedAt: v.number(),
});

const databasePropertyTypeValidator = v.union(
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

const editableDatabasePropertyTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("select"),
  v.literal("multi_select"),
  v.literal("status"),
  v.literal("date"),
  v.literal("checkbox"),
  v.literal("url"),
);

const creatableDatabasePropertyTypeValidator = v.union(
  editableDatabasePropertyTypeValidator,
  v.literal("relation"),
  v.literal("rollup"),
  v.literal("formula"),
);

const rollupFunctionValidator = v.union(
  v.literal("count"),
  v.literal("count_values"),
  v.literal("sum"),
  v.literal("average"),
  v.literal("min"),
  v.literal("max"),
);

const databaseViewTypeValidator = v.union(
  v.literal("table"),
  v.literal("board"),
  v.literal("calendar"),
  v.literal("timeline"),
);

const pageBlockValidator = v.object({
  id: v.id("pageBlocks"),
  pageId: v.id("documents"),
  parentBlockId: v.union(v.id("pageBlocks"), v.null()),
  type: pageBlockTypeValidator,
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

const toPageBlock = (block: Doc<"pageBlocks">) => ({
  id: block._id,
  pageId: block.pageId,
  parentBlockId: block.parentBlockId ?? null,
  type: block.type,
  order: block.order,
  text: block.text,
  checked: block.checked,
  url: block.url,
  alt: block.alt,
  caption: block.caption,
  color: block.color,
  propsJson: block.propsJson,
  dataSourceId: block.dataSourceId,
  viewId: block.viewId,
  syncGroupId: block.syncGroupId,
  linkedPageId: block.linkedPageId,
});

async function requireEnvironmentPage(
  ctx: { db: QueryCtx["db"] },
  workspaceId: string,
  pageId: Doc<"documents">["_id"],
  dynamic = false,
) {
  const page = await ctx.db.get(pageId);
  if (!page || page.userId !== workspaceId || page.isArchived) {
    throw mcpError("PAGE_NOT_FOUND", "Page not found in this workspace");
  }
  if (
    dynamic &&
    (page.contentModel !== "page_blocks" || page.kind === "database")
  ) {
    throw mcpError(
      "DYNAMIC_PAGE_REQUIRED",
      "This operation requires a page created with the page_blocks content model",
    );
  }
  return page;
}

export const list = query({
  args: {},
  returns: v.array(environmentViewValidator),
  handler: async (ctx) => {
    const ownerId = await requireUserId(ctx);
    const environments = await ctx.db
      .query("mcpEnvironments")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(50);

    return environments.map((environment) => ({
      _id: environment._id,
      _creationTime: environment._creationTime,
      name: environment.name,
      tokenPrefix: environment.tokenPrefix,
      isEnabled: environment.isEnabled,
      lastConnectedAt: environment.lastConnectedAt,
      lastClientName: environment.lastClientName,
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
  },
  returns: v.id("mcpEnvironments"),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const scope = await getWorkspaceBillingScope(ctx, ownerId);
    await requireProForUser(ctx, scope.billingOwnerId);
    const name = args.name.trim();
    if (!name) {
      throw mcpError("INVALID_NAME", "Environment name is required");
    }
    const tokenHash = normalizeTokenHash(args.tokenHash);
    const existing = await ctx.db
      .query("mcpEnvironments")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (existing) {
      throw mcpError("TOKEN_COLLISION", "Generate a new MCP environment token");
    }
    return await ctx.db.insert("mcpEnvironments", {
      ownerId,
      billingOwnerId: scope.billingOwnerId,
      workspaceId: scope.workspaceId,
      name: name.slice(0, 100),
      tokenHash,
      tokenPrefix: args.tokenPrefix.slice(0, 12),
      isEnabled: true,
    });
  },
});

export const setEnabled = mutation({
  args: { id: v.id("mcpEnvironments"), isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const environment = await ctx.db.get(args.id);
    if (!environment || environment.ownerId !== ownerId) {
      throw mcpError("ENVIRONMENT_NOT_FOUND", "MCP environment not found");
    }
    if (args.isEnabled) {
      await requireProForUser(
        ctx,
        environment.billingOwnerId ?? environment.ownerId,
      );
    }
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("mcpEnvironments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const environment = await ctx.db.get(args.id);
    if (!environment || environment.ownerId !== ownerId) {
      throw mcpError("ENVIRONMENT_NOT_FOUND", "MCP environment not found");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const getAccess = query({
  args: { tokenHash: v.string() },
  returns: accessValidator,
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) return null;
    return {
      environmentId: environment._id,
      environmentName: environment.name,
      workspaceId: environment.workspaceId,
    };
  },
});

export const listDocuments = query({
  args: { tokenHash: v.string(), limit: v.optional(v.number()) },
  returns: v.array(documentSummaryValidator),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 20), 50));
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", environment.workspaceId).eq("isArchived", false),
      )
      .order("desc")
      .take(limit);
    return await Promise.all(
      documents.map(async (document) =>
        toCanonicalPageSummary(
          document,
          await listCanonicalPropertyValues(ctx, document._id),
        ),
      ),
    );
  },
});

export const searchDocuments = query({
  args: {
    tokenHash: v.string(),
    search: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(documentSummaryValidator),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const search = args.search.trim();
    if (!search) return [];
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 10), 20));
    const documents = await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q
          .search("title", search)
          .eq("userId", environment.workspaceId)
          .eq("isArchived", false),
      )
      .take(limit);
    return await Promise.all(
      documents.map(async (document) =>
        toCanonicalPageSummary(
          document,
          await listCanonicalPropertyValues(ctx, document._id),
        ),
      ),
    );
  },
});

export const getDocument = query({
  args: { tokenHash: v.string(), documentId: v.id("documents") },
  returns: v.union(v.null(), documentDetailValidator),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.userId !== environment.workspaceId ||
      document.isArchived
    ) {
      return null;
    }
    const [properties, blocks] = await Promise.all([
      listCanonicalPropertyValues(ctx, document._id),
      ctx.db
        .query("pageBlocks")
        .withIndex("by_page", (q) => q.eq("pageId", document._id))
        .take(1_001),
    ]);
    return {
      ...toCanonicalPageSummary(document, properties),
      blocks: blocks.slice(0, 1_000).map(toCanonicalBlock),
      blocksTruncated: blocks.length > 1_000,
    };
  },
});

export const listPageTemplatesForMcp = query({
  args: { tokenHash: v.string() },
  returns: v.array(templateSummaryValidator),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await listPageTemplates(ctx, environment.workspaceId);
  },
});

export const createPageTemplateForMcp = mutation({
  args: {
    tokenHash: v.string(),
    sourcePageId: v.id("documents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("pageTemplates"),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await createPageTemplateFromPage(ctx, environment.workspaceId, {
      sourcePageId: args.sourcePageId,
      name: args.name,
      description: args.description,
    });
  },
});

export const instantiatePageTemplateForMcp = mutation({
  args: {
    tokenHash: v.string(),
    templateId: v.id("pageTemplates"),
    parentDocument: v.optional(v.id("documents")),
    title: v.optional(v.string()),
  },
  returns: v.object({
    rootDocumentId: v.id("documents"),
    documentIds: v.array(v.id("documents")),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await instantiatePageTemplate(ctx, environment.workspaceId, {
      templateId: args.templateId,
      parentDocument: args.parentDocument,
      title: args.title,
    });
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
  returns: createdPageValidator,
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const created = await createPageDomain(ctx, environment.workspaceId, {
      title: args.title,
      parentId: args.parentId,
      content: args.content,
      icon: args.icon,
      cover: args.cover,
      isPublished: args.isPublished,
      contentModel: args.contentModel,
    });
    return {
      key: "document",
      id: created.id,
      title: created.title,
      parentId: created.parentId,
    };
  },
});

export const createWorkspace = mutation({
  args: { tokenHash: v.string(), pages: v.array(workspacePageValidator) },
  returns: v.array(createdPageValidator),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    if (args.pages.length < 1 || args.pages.length > 50) {
      throw mcpError(
        "INVALID_BLUEPRINT",
        "A workspace blueprint must contain 1 to 50 pages",
      );
    }
    const idsByKey = new Map<string, Doc<"documents">["_id"]>();
    const created: Array<{
      key: string;
      id: Doc<"documents">["_id"];
      title: string;
      parentId: Doc<"documents">["_id"] | null;
    }> = [];
    let totalContentLength = 0;

    for (const [index, page] of args.pages.entries()) {
      const key = page.key.trim();
      const title = page.title.trim();
      if (!key || key.length > 80 || idsByKey.has(key)) {
        throw mcpError(
          "INVALID_PAGE_KEY",
          `Page ${index + 1} has an empty, duplicate, or oversized key`,
        );
      }
      if (!title || title.length > 200) {
        throw mcpError(
          "INVALID_TITLE",
          `Page ${index + 1} must have a title of 1 to 200 characters`,
        );
      }
      totalContentLength += page.content?.length ?? 0;
      if (totalContentLength > 500_000) {
        throw mcpError(
          "CONTENT_TOO_LARGE",
          "Workspace content exceeds 500,000 characters",
        );
      }
      const parentId = page.parentKey
        ? idsByKey.get(page.parentKey.trim())
        : undefined;
      if (page.parentKey && !parentId) {
        throw mcpError(
          "INVALID_PARENT_KEY",
          `Page ${index + 1} references a parent that must appear earlier in the blueprint`,
        );
      }
      const now = Date.now();
      const contentModel = page.contentModel ?? "page_blocks";
      const id = await ctx.db.insert("documents", {
        title,
        parentDocument: parentId,
        content: page.content,
        icon: page.icon?.slice(0, 20),
        userId: environment.workspaceId,
        fullWidth: true,
        showToc: true,
        isArchived: false,
        isPublished: page.isPublished ?? false,
        kind: "page",
        contentModel,
        order: index,
        updatedAt: now,
      });
      if (contentModel === "page_blocks") {
        await ctx.db.insert("pageBlocks", {
          workspaceId: environment.workspaceId,
          pageId: id,
          type: "paragraph",
          order: 0,
          text: "",
          createdAt: now,
          updatedAt: now,
        });
      }
      idsByKey.set(key, id);
      created.push({ key, id, title, parentId: parentId ?? null });
    }

    return created;
  },
});

export const listPageBlocks = query({
  args: { tokenHash: v.string(), pageId: v.id("documents") },
  returns: v.array(pageBlockValidator),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    await requireEnvironmentPage(
      ctx,
      environment.workspaceId,
      args.pageId,
      true,
    );
    const blocks = await ctx.db
      .query("pageBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .take(2_000);
    return blocks
      .sort((left, right) => left.order - right.order)
      .map(toPageBlock);
  },
});

export const getSyncedBlockForMcp = query({
  args: {
    tokenHash: v.string(),
    referenceBlockId: v.id("pageBlocks"),
  },
  returns: v.object({
    groupId: v.id("syncedBlockGroups"),
    referenceBlockId: v.id("pageBlocks"),
    sourcePageId: v.id("documents"),
    sourceRootBlockId: v.id("pageBlocks"),
    blocks: v.array(pageBlockValidator),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const syncedBlock = await getSyncedBlockContent(
      ctx,
      environment.workspaceId,
      args.referenceBlockId,
    );
    return {
      ...syncedBlock,
      blocks: syncedBlock.blocks.map((block) => ({
        ...block,
        parentBlockId: block.parentBlockId ?? null,
      })),
    };
  },
});

export const createSyncedReferenceForMcp = mutation({
  args: {
    tokenHash: v.string(),
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
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await createSyncedBlockReference(ctx, environment.workspaceId, {
      sourceBlockId: args.sourceBlockId,
      targetPageId: args.targetPageId,
      parentBlockId: args.parentBlockId,
      afterBlockId: args.afterBlockId,
    });
  },
});

export const unlinkSyncedReferenceForMcp = mutation({
  args: {
    tokenHash: v.string(),
    referenceBlockId: v.id("pageBlocks"),
  },
  returns: v.object({
    rootBlockId: v.id("pageBlocks"),
    blockIds: v.array(v.id("pageBlocks")),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await unlinkSyncedBlockReference(
      ctx,
      environment.workspaceId,
      args.referenceBlockId,
    );
  },
});

export const splitPageBlockAtCaretForMcp = mutation({
  args: {
    tokenHash: v.string(),
    blockId: v.id("pageBlocks"),
    text: v.string(),
    cursorOffset: v.number(),
    operationId: v.string(),
  },
  returns: v.object({
    focusBlockId: v.id("pageBlocks"),
    action: v.union(v.literal("split"), v.literal("normalized")),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await splitPageBlockAtCaret(ctx, environment.workspaceId, {
      blockId: args.blockId,
      text: args.text,
      cursorOffset: args.cursorOffset,
      operationId: args.operationId,
    });
  },
});

export const createChildPageBlockForMcp = mutation({
  args: {
    tokenHash: v.string(),
    pageId: v.id("documents"),
    parentBlockId: v.optional(v.id("pageBlocks")),
    afterBlockId: v.optional(v.id("pageBlocks")),
    replaceBlockId: v.optional(v.id("pageBlocks")),
    title: v.optional(v.string()),
    operationId: v.string(),
  },
  returns: v.object({
    blockId: v.id("pageBlocks"),
    pageId: v.id("documents"),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await createChildPageBlock(ctx, environment.workspaceId, {
      pageId: args.pageId,
      parentBlockId: args.parentBlockId,
      afterBlockId: args.afterBlockId,
      replaceBlockId: args.replaceBlockId,
      title: args.title,
      operationId: args.operationId,
    });
  },
});

export const createPageBlocks = mutation({
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
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await createBlocksDomain(
      ctx,
      environment.workspaceId,
      args.pageId,
      args.blocks,
    );
  },
});

export const updatePageBlock = mutation({
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
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await updateBlockDomain(
      ctx,
      environment.workspaceId,
      args as UpdateBlockInput,
    );
  },
});

export const movePageBlock = mutation({
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
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await moveBlockDomain(
      ctx,
      environment.workspaceId,
      args as MoveBlockInput,
    );
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
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await updatePageDomain(ctx, environment.workspaceId, args as UpdatePageInput);
  },
});

export const archiveDocument = mutation({
  args: { tokenHash: v.string(), documentId: v.id("documents") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await archivePageDomain(ctx, environment.workspaceId, args.documentId);
  },
});

export const createDatabase = mutation({
  args: {
    tokenHash: v.string(),
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  returns: v.object({
    documentId: v.id("documents"),
    dataSourceId: v.id("dataSources"),
    viewId: v.id("databaseViews"),
    titlePropertyId: v.id("databaseProperties"),
    statusPropertyId: v.id("databaseProperties"),
    statusOptionIds: v.array(v.id("databaseSelectOptions")),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await createDatabaseDomain(ctx, environment.workspaceId, {
      title: args.title,
      parentDocument: args.parentDocument,
    });
  },
});

export const getDatabaseSummary = query({
  args: {
    tokenHash: v.string(),
    documentId: v.id("documents"),
  },
  returns: v.union(
    v.null(),
    v.object({
      documentId: v.id("documents"),
      dataSourceId: v.id("dataSources"),
      name: v.string(),
      properties: v.array(
        v.object({
          id: v.id("databaseProperties"),
          name: v.string(),
          type: databasePropertyTypeValidator,
          relationDataSourceId: v.optional(v.id("dataSources")),
          reciprocalPropertyId: v.optional(v.id("databaseProperties")),
          rollupRelationPropertyId: v.optional(v.id("databaseProperties")),
          rollupTargetPropertyId: v.optional(v.id("databaseProperties")),
          rollupFunction: v.optional(rollupFunctionValidator),
          formulaExpression: v.optional(v.string()),
          formulaVersion: v.optional(v.number()),
          formulaDependencyPropertyIds: v.optional(
            v.array(v.id("databaseProperties")),
          ),
        }),
      ),
      options: v.array(
        v.object({
          id: v.id("databaseSelectOptions"),
          propertyId: v.id("databaseProperties"),
          name: v.string(),
          color: v.string(),
        }),
      ),
      views: v.array(
        v.object({
          id: v.id("databaseViews"),
          name: v.string(),
          type: databaseViewTypeValidator,
          visiblePropertyIds: v.array(v.id("databaseProperties")),
          sorts: v.array(
            v.object({
              propertyId: v.id("databaseProperties"),
              direction: v.union(v.literal("asc"), v.literal("desc")),
            }),
          ),
          filterJson: v.optional(v.string()),
          groupPropertyId: v.optional(v.id("databaseProperties")),
          datePropertyId: v.optional(v.id("databaseProperties")),
        }),
      ),
      relationOptions: v.array(
        v.object({
          propertyId: v.id("databaseProperties"),
          rows: v.array(
            v.object({
              id: v.id("documents"),
              title: v.string(),
              icon: v.optional(v.string()),
            }),
          ),
        }),
      ),
      rows: v.array(
        v.object({
          id: v.id("documents"),
          title: v.string(),
          values: v.array(
            v.object({
              propertyId: v.id("databaseProperties"),
              textValue: v.optional(v.string()),
              numberValue: v.optional(v.number()),
              booleanValue: v.optional(v.boolean()),
              dateStart: v.optional(v.number()),
              dateEnd: v.optional(v.number()),
              optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
              relationDocumentIds: v.optional(v.array(v.id("documents"))),
            }),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const snapshot = await getDatabaseSnapshot(
      ctx,
      environment.workspaceId,
      args.documentId,
    );
    if (!snapshot) return null;
    return {
      documentId: snapshot.dataSource.documentId,
      dataSourceId: snapshot.dataSource.id,
      name: snapshot.dataSource.name,
      properties: snapshot.properties.map((property) => ({
        id: property.id,
        name: property.name,
        type: property.type,
        relationDataSourceId: property.relationDataSourceId,
        reciprocalPropertyId: property.reciprocalPropertyId,
        rollupRelationPropertyId: property.rollupRelationPropertyId,
        rollupTargetPropertyId: property.rollupTargetPropertyId,
        rollupFunction: property.rollupFunction,
        formulaExpression: property.formulaExpression,
        formulaVersion: property.formulaVersion,
        formulaDependencyPropertyIds: property.formulaDependencyPropertyIds,
      })),
      options: snapshot.options.map((option) => ({
        id: option.id,
        propertyId: option.propertyId,
        name: option.name,
        color: option.color,
      })),
      views: snapshot.views.map((view) => ({
        id: view.id,
        name: view.name,
        type: view.type,
        visiblePropertyIds: view.visiblePropertyIds,
        sorts: view.sorts,
        filterJson: view.filterJson,
        groupPropertyId: view.groupPropertyId,
        datePropertyId: view.datePropertyId,
      })),
      relationOptions: snapshot.relationOptions,
      rows: snapshot.rows.map((row) => ({
        id: row.id,
        title: row.title,
        values: row.values.map((value) => ({
          propertyId: value.propertyId,
          textValue: value.textValue,
          numberValue: value.numberValue,
          booleanValue: value.booleanValue,
          dateStart: value.dateStart,
          dateEnd: value.dateEnd,
          optionIds: value.optionIds,
          relationDocumentIds: value.relationDocuments?.map(
            (document) => document.id,
          ),
        })),
      })),
    };
  },
});

const databaseSortValidator = v.object({
  propertyId: v.id("databaseProperties"),
  direction: v.union(v.literal("asc"), v.literal("desc")),
});

const databaseFilterValidator = v.object({
  propertyId: v.id("databaseProperties"),
  operator: v.union(
    v.literal("equals"),
    v.literal("not_equals"),
    v.literal("contains"),
    v.literal("is_empty"),
    v.literal("is_not_empty"),
  ),
  value: v.optional(v.union(v.string(), v.number(), v.boolean())),
});

export const addDatabaseProperty = mutation({
  args: {
    tokenHash: v.string(),
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    type: creatableDatabasePropertyTypeValidator,
    relationDataSourceId: v.optional(v.id("dataSources")),
    reciprocalName: v.optional(v.string()),
    rollupRelationPropertyId: v.optional(v.id("databaseProperties")),
    rollupTargetPropertyId: v.optional(v.id("databaseProperties")),
    rollupFunction: v.optional(rollupFunctionValidator),
    formulaExpression: v.optional(v.string()),
    options: v.optional(
      v.array(v.object({ name: v.string(), color: v.string() })),
    ),
  },
  returns: v.object({
    propertyId: v.id("databaseProperties"),
    reciprocalPropertyId: v.optional(v.id("databaseProperties")),
    optionIds: v.array(v.id("databaseSelectOptions")),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    await requireDataSource(ctx, environment.workspaceId, args.dataSourceId);
    if (args.type === "relation") {
      if (!args.relationDataSourceId) {
        throw databaseError(
          "RELATION_TARGET_REQUIRED",
          "Choose a target database for this relation",
        );
      }
      await requireDataSource(
        ctx,
        environment.workspaceId,
        args.relationDataSourceId,
      );
    } else if (args.relationDataSourceId) {
      throw databaseError(
        "INVALID_RELATION_TARGET",
        "Only relation properties accept a target database",
      );
    }
    if (args.reciprocalName && args.type !== "relation") {
      throw databaseError(
        "INVALID_RECIPROCAL_RELATION",
        "Only relation properties can create a reciprocal property",
      );
    }
    if (args.type === "rollup") {
      if (
        !args.rollupRelationPropertyId ||
        !args.rollupTargetPropertyId ||
        !args.rollupFunction
      ) {
        throw databaseError(
          "ROLLUP_CONFIGURATION_REQUIRED",
          "Choose a relation, target property, and aggregation",
        );
      }
      const [relationProperty, targetProperty] = await Promise.all([
        requireDatabaseProperty(
          ctx,
          environment.workspaceId,
          args.rollupRelationPropertyId,
        ),
        requireDatabaseProperty(
          ctx,
          environment.workspaceId,
          args.rollupTargetPropertyId,
        ),
      ]);
      if (
        relationProperty.dataSourceId !== args.dataSourceId ||
        relationProperty.type !== "relation" ||
        !relationProperty.relationDataSourceId ||
        targetProperty.dataSourceId !== relationProperty.relationDataSourceId
      ) {
        throw databaseError(
          "INVALID_ROLLUP_CONFIGURATION",
          "Rollup properties must follow a relation into its target database",
        );
      }
      if (
        ["sum", "average", "min", "max"].includes(args.rollupFunction) &&
        targetProperty.type !== "number"
      ) {
        throw databaseError(
          "ROLLUP_NUMBER_REQUIRED",
          "This aggregation requires a number property",
        );
      }
    } else if (
      args.rollupRelationPropertyId ||
      args.rollupTargetPropertyId ||
      args.rollupFunction
    ) {
      throw databaseError(
        "INVALID_ROLLUP_CONFIGURATION",
        "Only rollup properties accept rollup configuration",
      );
    }
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw databaseError("INVALID_NAME", "Property name is required");
    }
    const properties = await ctx.db
      .query("databaseProperties")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(100);
    if (properties.length >= 100) {
      throw databaseError(
        "PROPERTY_LIMIT",
        "This database already has 100 properties",
      );
    }
    let compiledFormula:
      ReturnType<typeof compileFormulaExpression> | undefined;
    if (args.type === "formula") {
      if (!args.formulaExpression) {
        throw databaseError(
          "FORMULA_REQUIRED",
          "Enter an expression for this formula",
        );
      }
      try {
        compiledFormula = compileFormulaExpression(
          args.formulaExpression,
          properties.map((property) => ({
            id: property._id,
            name: property.name,
          })),
        );
      } catch (error) {
        throw databaseError(
          "INVALID_FORMULA",
          error instanceof Error ? error.message : "Formula is invalid",
        );
      }
    } else if (args.formulaExpression) {
      throw databaseError(
        "INVALID_FORMULA",
        "Only formula properties accept an expression",
      );
    }
    const suppliedOptions = args.options ?? [];
    if (
      suppliedOptions.length &&
      !["select", "multi_select", "status"].includes(args.type)
    ) {
      throw databaseError(
        "INVALID_PROPERTY_OPTIONS",
        "Only select, multi-select, and status properties accept options",
      );
    }
    if (suppliedOptions.length > 100) {
      throw databaseError(
        "OPTION_LIMIT",
        "A property supports up to 100 options",
      );
    }
    const now = Date.now();
    const propertyId = await ctx.db.insert("databaseProperties", {
      workspaceId: environment.workspaceId,
      dataSourceId: args.dataSourceId,
      name,
      type: args.type,
      relationDataSourceId: args.relationDataSourceId,
      rollupRelationPropertyId: args.rollupRelationPropertyId,
      rollupTargetPropertyId: args.rollupTargetPropertyId,
      rollupFunction: args.rollupFunction,
      formulaExpression: args.formulaExpression?.trim(),
      formulaVersion: compiledFormula?.version,
      formulaAstJson: compiledFormula?.astJson,
      formulaDependencyPropertyIds: compiledFormula?.dependencyPropertyIds as
        Doc<"databaseProperties">["_id"][] | undefined,
      order: properties.length,
      createdAt: now,
      updatedAt: now,
    });
    const views = await ctx.db
      .query("databaseViews")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(50);
    await Promise.all(
      views.map((view) =>
        ctx.db.patch(view._id, {
          visiblePropertyIds: [...view.visiblePropertyIds, propertyId],
          updatedAt: now,
        }),
      ),
    );
    const reciprocalPropertyId =
      args.type === "relation" && args.reciprocalName
        ? await createReciprocalRelationProperty(ctx, environment.workspaceId, {
            primaryPropertyId: propertyId,
            name: args.reciprocalName,
          })
        : undefined;
    const options =
      args.type === "status" && !suppliedOptions.length
        ? [
            { name: "Not started", color: "slate" },
            { name: "In progress", color: "blue" },
            { name: "Done", color: "green" },
          ]
        : suppliedOptions;
    const optionIds: Doc<"databaseSelectOptions">["_id"][] = [];
    for (const [order, option] of options.entries()) {
      const optionName = option.name.trim();
      if (!optionName || optionName.length > 100) {
        throw databaseError(
          "INVALID_OPTION",
          `Option ${order + 1} must have a name of 1 to 100 characters`,
        );
      }
      optionIds.push(
        await ctx.db.insert("databaseSelectOptions", {
          workspaceId: environment.workspaceId,
          dataSourceId: args.dataSourceId,
          propertyId,
          name: optionName,
          color: option.color.trim().slice(0, 30) || "slate",
          order,
        }),
      );
    }
    return { propertyId, reciprocalPropertyId, optionIds };
  },
});

export const updateDatabasePropertyForMcp = mutation({
  args: {
    tokenHash: v.string(),
    propertyId: v.id("databaseProperties"),
    name: v.optional(v.string()),
    formulaExpression: v.optional(v.string()),
  },
  returns: v.object({
    propertyId: v.id("databaseProperties"),
    name: v.string(),
    formulaExpression: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await updateDatabaseProperty(ctx, environment.workspaceId, {
      propertyId: args.propertyId,
      name: args.name,
      formulaExpression: args.formulaExpression,
    });
  },
});

async function validateViewConfiguration(
  ctx: { db: QueryCtx["db"] },
  workspaceId: string,
  dataSourceId: Doc<"dataSources">["_id"],
  config: {
    visiblePropertyIds?: Doc<"databaseProperties">["_id"][];
    sorts?: Array<{
      propertyId: Doc<"databaseProperties">["_id"];
      direction: "asc" | "desc";
    }>;
    filters?: Array<{
      propertyId: Doc<"databaseProperties">["_id"];
      operator:
        "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
      value?: string | number | boolean;
    }>;
    groupPropertyId?: Doc<"databaseProperties">["_id"];
    datePropertyId?: Doc<"databaseProperties">["_id"];
  },
) {
  const properties = await ctx.db
    .query("databaseProperties")
    .withIndex("by_data_source", (q) => q.eq("dataSourceId", dataSourceId))
    .take(100);
  const propertyById = new Map(
    properties.map((property) => [property._id as string, property]),
  );
  if (properties.some((property) => property.workspaceId !== workspaceId)) {
    throw databaseError("DATA_SOURCE_NOT_FOUND", "Database not found");
  }
  const referencedIds = [
    ...(config.visiblePropertyIds ?? []),
    ...(config.sorts ?? []).map((sort) => sort.propertyId),
    ...(config.filters ?? []).map((filter) => filter.propertyId),
    ...(config.groupPropertyId ? [config.groupPropertyId] : []),
    ...(config.datePropertyId ? [config.datePropertyId] : []),
  ];
  if (referencedIds.some((propertyId) => !propertyById.has(propertyId))) {
    throw databaseError(
      "PROPERTY_SOURCE_MISMATCH",
      "Every view property must belong to this database",
    );
  }
  if (
    config.groupPropertyId &&
    !["status", "select"].includes(
      propertyById.get(config.groupPropertyId)?.type ?? "",
    )
  ) {
    throw databaseError(
      "INVALID_GROUP_PROPERTY",
      "Pipelines can group only by status or select properties",
    );
  }
  if (
    config.datePropertyId &&
    propertyById.get(config.datePropertyId)?.type !== "date"
  ) {
    throw databaseError(
      "INVALID_DATE_PROPERTY",
      "Calendar and timeline views require a date property",
    );
  }
  return properties.sort((left, right) => left.order - right.order);
}

export const createDatabaseView = mutation({
  args: {
    tokenHash: v.string(),
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    type: databaseViewTypeValidator,
    visiblePropertyIds: v.optional(v.array(v.id("databaseProperties"))),
    sorts: v.optional(v.array(databaseSortValidator)),
    filters: v.optional(v.array(databaseFilterValidator)),
    groupPropertyId: v.optional(v.id("databaseProperties")),
    datePropertyId: v.optional(v.id("databaseProperties")),
  },
  returns: v.id("databaseViews"),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    await requireDataSource(ctx, environment.workspaceId, args.dataSourceId);
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw databaseError("INVALID_VIEW_NAME", "View name is required");
    }
    const views = await ctx.db
      .query("databaseViews")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(50);
    if (views.length >= 50) {
      throw databaseError("VIEW_LIMIT", "This database already has 50 views");
    }
    const properties = await validateViewConfiguration(
      ctx,
      environment.workspaceId,
      args.dataSourceId,
      args,
    );
    const groupPropertyId =
      args.groupPropertyId ??
      (args.type === "board"
        ? properties.find((property) =>
            ["status", "select"].includes(property.type),
          )?._id
        : undefined);
    const datePropertyId =
      args.datePropertyId ??
      (["calendar", "timeline"].includes(args.type)
        ? properties.find((property) => property.type === "date")?._id
        : undefined);
    if (args.type === "board" && !groupPropertyId) {
      throw databaseError(
        "GROUP_PROPERTY_REQUIRED",
        "Add a status or select property before creating a pipeline",
      );
    }
    if (["calendar", "timeline"].includes(args.type) && !datePropertyId) {
      throw databaseError(
        "DATE_PROPERTY_REQUIRED",
        "Add a date property before creating this view",
      );
    }
    const now = Date.now();
    return await ctx.db.insert("databaseViews", {
      workspaceId: environment.workspaceId,
      dataSourceId: args.dataSourceId,
      name,
      type: args.type,
      order: views.length,
      visiblePropertyIds:
        args.visiblePropertyIds ?? properties.map((property) => property._id),
      sorts: args.sorts ?? [],
      filterJson: args.filters ? serializeViewFilters(args.filters) : undefined,
      groupPropertyId,
      datePropertyId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const configureDatabaseView = mutation({
  args: {
    tokenHash: v.string(),
    viewId: v.id("databaseViews"),
    name: v.optional(v.string()),
    visiblePropertyIds: v.optional(v.array(v.id("databaseProperties"))),
    sorts: v.optional(v.array(databaseSortValidator)),
    filters: v.optional(v.array(databaseFilterValidator)),
    groupPropertyId: v.optional(v.id("databaseProperties")),
    datePropertyId: v.optional(v.id("databaseProperties")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const view = await ctx.db.get(args.viewId);
    if (!view || view.workspaceId !== environment.workspaceId) {
      throw databaseError("VIEW_NOT_FOUND", "Database view not found");
    }
    await validateViewConfiguration(
      ctx,
      environment.workspaceId,
      view.dataSourceId,
      args,
    );
    const name = args.name?.trim();
    if (args.name !== undefined && (!name || name.length > 100)) {
      throw databaseError("INVALID_VIEW_NAME", "View name is required");
    }
    await ctx.db.patch(view._id, {
      ...(name !== undefined ? { name } : {}),
      ...(args.visiblePropertyIds !== undefined
        ? { visiblePropertyIds: args.visiblePropertyIds }
        : {}),
      ...(args.sorts !== undefined ? { sorts: args.sorts } : {}),
      ...(args.filters !== undefined
        ? { filterJson: serializeViewFilters(args.filters) }
        : {}),
      ...(args.groupPropertyId !== undefined
        ? { groupPropertyId: args.groupPropertyId }
        : {}),
      ...(args.datePropertyId !== undefined
        ? { datePropertyId: args.datePropertyId }
        : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const addDatabaseRow = mutation({
  args: {
    tokenHash: v.string(),
    dataSourceId: v.id("dataSources"),
    title: v.string(),
    templateId: v.optional(v.id("databaseRowTemplates")),
    initialValues: v.optional(
      v.array(
        v.object({
          propertyId: v.id("databaseProperties"),
          textValue: v.optional(v.string()),
          numberValue: v.optional(v.number()),
          booleanValue: v.optional(v.boolean()),
          dateStart: v.optional(v.number()),
          dateEnd: v.optional(v.number()),
          optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
        }),
      ),
    ),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    return await addDatabaseRowDomain(ctx, environment.workspaceId, args);
  },
});

export const setDatabaseValue = mutation({
  args: {
    tokenHash: v.string(),
    documentId: v.id("documents"),
    propertyId: v.id("databaseProperties"),
    textValue: v.optional(v.string()),
    numberValue: v.optional(v.number()),
    booleanValue: v.optional(v.boolean()),
    dateStart: v.optional(v.number()),
    dateEnd: v.optional(v.number()),
    optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
  },
  returns: v.id("databasePropertyValues"),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    const { documentId, propertyId } = args;
    return await setDatabasePropertyValue(ctx, environment.workspaceId, {
      documentId,
      propertyId,
      value: {
        textValue: args.textValue,
        numberValue: args.numberValue,
        booleanValue: args.booleanValue,
        dateStart: args.dateStart,
        dateEnd: args.dateEnd,
        optionIds: args.optionIds,
      },
    });
  },
});

export const setDatabaseRelation = mutation({
  args: {
    tokenHash: v.string(),
    documentId: v.id("documents"),
    propertyId: v.id("databaseProperties"),
    targetDocumentIds: v.array(v.id("documents")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) {
      throw mcpError("UNAUTHORIZED", "MCP environment is unavailable");
    }
    await setDatabaseRelationTargets(ctx, environment.workspaceId, {
      documentId: args.documentId,
      propertyId: args.propertyId,
      targetDocumentIds: args.targetDocumentIds,
    });
    return null;
  },
});

export const recordConnection = mutation({
  args: { tokenHash: v.string(), clientName: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const environment = await getEnvironmentByTokenHash(ctx, args.tokenHash);
    if (!environment) return null;
    await ctx.db.patch(environment._id, {
      lastConnectedAt: Date.now(),
      lastClientName: args.clientName?.trim().slice(0, 100),
    });
    return null;
  },
});
