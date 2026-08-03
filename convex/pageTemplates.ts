import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  createPageTemplateFromPage,
  instantiatePageTemplate,
  listPageTemplates,
  removePageTemplate,
} from "./lib/pageTemplateDomain";
import { getWorkspaceScope } from "./lib/workspace";

async function requireWorkspaceId(
  ctx: Parameters<typeof getWorkspaceScope>[0],
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in to manage page templates",
    });
  }
  return await getWorkspaceScope(ctx, identity.subject);
}

const templateSummaryValidator = v.object({
  id: v.id("pageTemplates"),
  name: v.string(),
  description: v.optional(v.string()),
  icon: v.optional(v.string()),
  pageCount: v.number(),
  blockCount: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(templateSummaryValidator),
  handler: async (ctx) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await listPageTemplates(ctx, workspaceId);
  },
});

export const createFromPage = mutation({
  args: {
    sourcePageId: v.id("documents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("pageTemplates"),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await createPageTemplateFromPage(ctx, workspaceId, args);
  },
});

export const instantiate = mutation({
  args: {
    templateId: v.id("pageTemplates"),
    parentDocument: v.optional(v.id("documents")),
    title: v.optional(v.string()),
  },
  returns: v.object({
    rootDocumentId: v.id("documents"),
    documentIds: v.array(v.id("documents")),
  }),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await instantiatePageTemplate(ctx, workspaceId, args);
  },
});

export const duplicatePage = mutation({
  args: { sourcePageId: v.id("documents") },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    const source = await ctx.db.get(args.sourcePageId);
    if (!source || source.userId !== workspaceId || source.isArchived) {
      throw new ConvexError({
        code: "PAGE_NOT_FOUND",
        message: "Page not found in this workspace",
      });
    }

    if (source.kind === "database") {
      return await ctx.db.insert("documents", {
        title: `${source.title} copy`,
        userId: workspaceId,
        isArchived: false,
        parentDocument: source.parentDocument,
        coverImage: source.coverImage,
        icon: source.icon,
        isPublished: false,
        order: (source.order ?? 0) + 1,
        updatedAt: Date.now(),
        editorFont: source.editorFont,
        fullWidth: source.fullWidth,
        smallText: source.smallText,
        showToc: source.showToc,
        kind: "database",
        dataSourceId: source.dataSourceId,
        contentModel: source.contentModel,
      });
    }

    const templateId = await createPageTemplateFromPage(ctx, workspaceId, {
      sourcePageId: args.sourcePageId,
      name: `${source.title} duplicate`,
    });
    try {
      const duplicated = await instantiatePageTemplate(ctx, workspaceId, {
        templateId,
        parentDocument: source.parentDocument,
        title: `${source.title} copy`,
      });
      return duplicated.rootDocumentId;
    } finally {
      await removePageTemplate(ctx, workspaceId, templateId);
    }
  },
});

export const remove = mutation({
  args: { templateId: v.id("pageTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    await removePageTemplate(ctx, workspaceId, args.templateId);
    return null;
  },
});
