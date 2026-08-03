import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

const templateError = (code: string, message: string) =>
  new ConvexError({ code, message });

async function requirePage(
  ctx: ReadCtx,
  workspaceId: string,
  pageId: Id<"documents">,
) {
  const page = await ctx.db.get(pageId);
  if (!page || page.userId !== workspaceId || page.isArchived) {
    throw templateError("PAGE_NOT_FOUND", "Page not found in this workspace");
  }
  return page;
}

async function requireTemplate(
  ctx: ReadCtx,
  workspaceId: string,
  templateId: Id<"pageTemplates">,
) {
  const template = await ctx.db.get(templateId);
  if (!template || template.workspaceId !== workspaceId) {
    throw templateError(
      "TEMPLATE_NOT_FOUND",
      "Template not found in this workspace",
    );
  }
  return template;
}

export async function listPageTemplates(ctx: ReadCtx, workspaceId: string) {
  const templates = await ctx.db
    .query("pageTemplates")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(100);
  return templates
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((template) => ({
      id: template._id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      pageCount: template.pageCount,
      blockCount: template.blockCount,
      updatedAt: template.updatedAt,
    }));
}

export async function createPageTemplateFromPage(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    sourcePageId: Id<"documents">;
    name?: string;
    description?: string;
  },
) {
  const root = await requirePage(ctx, workspaceId, args.sourcePageId);
  if (root.kind === "database" || root.contentModel !== "page_blocks") {
    throw templateError(
      "UNSUPPORTED_TEMPLATE_SOURCE",
      "Only dynamic pages can be saved as templates",
    );
  }
  const existingTemplates = await ctx.db
    .query("pageTemplates")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(100);
  if (existingTemplates.length >= 100) {
    throw templateError(
      "TEMPLATE_LIMIT",
      "This workspace already has 100 templates",
    );
  }

  const pages: Doc<"documents">[] = [];
  const queue = [root];
  while (queue.length) {
    const page = queue.shift()!;
    pages.push(page);
    if (pages.length > 100) {
      throw templateError(
        "TEMPLATE_PAGE_LIMIT",
        "A template can contain up to 100 pages",
      );
    }
    const children = await ctx.db
      .query("documents")
      .withIndex("by_user_parent_archived_data_source", (q) =>
        q
          .eq("userId", workspaceId)
          .eq("parentDocument", page._id)
          .eq("isArchived", false)
          .eq("dataSourceId", undefined),
      )
      .take(500);
    const templateChildren = children
      .filter(
        (child) =>
          child.kind !== "database" && child.contentModel === "page_blocks",
      )
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    queue.push(...templateChildren);
  }

  const blocksByPage = new Map<string, Doc<"pageBlocks">[]>();
  let blockCount = 0;
  for (const page of pages) {
    const blocks = await ctx.db
      .query("pageBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .take(2_000);
    blockCount += blocks.length;
    if (blockCount > 5_000) {
      throw templateError(
        "TEMPLATE_BLOCK_LIMIT",
        "A template can contain up to 5,000 blocks",
      );
    }
    blocksByPage.set(page._id, blocks);
  }

  const templateName = (args.name ?? root.title).trim();
  if (!templateName || templateName.length > 100) {
    throw templateError(
      "INVALID_TEMPLATE_NAME",
      "Template name must contain 1 to 100 characters",
    );
  }
  const description = args.description?.trim();
  if (description && description.length > 500) {
    throw templateError(
      "INVALID_TEMPLATE_DESCRIPTION",
      "Template description is too long",
    );
  }
  const now = Date.now();
  const templateId = await ctx.db.insert("pageTemplates", {
    workspaceId,
    name: templateName,
    description: description || undefined,
    icon: root.icon,
    pageCount: pages.length,
    blockCount,
    createdAt: now,
    updatedAt: now,
  });

  const templatePageBySource = new Map<string, Id<"pageTemplatePages">>();
  for (const page of pages) {
    const parentTemplatePageId = page.parentDocument
      ? templatePageBySource.get(page.parentDocument)
      : undefined;
    const templatePageId = await ctx.db.insert("pageTemplatePages", {
      workspaceId,
      templateId,
      parentTemplatePageId,
      title: page.title,
      icon: page.icon,
      coverImage: page.coverImage,
      fullWidth: page.fullWidth,
      smallText: page.smallText,
      showToc: page.showToc,
      order: page === root ? 0 : (page.order ?? 0),
    });
    templatePageBySource.set(page._id, templatePageId);
  }

  for (const page of pages) {
    const templatePageId = templatePageBySource.get(page._id)!;
    const unresolved = [...(blocksByPage.get(page._id) ?? [])];
    const templateBlockBySource = new Map<string, Id<"pageTemplateBlocks">>();
    while (unresolved.length) {
      const index = unresolved.findIndex(
        (block) =>
          !block.parentBlockId ||
          templateBlockBySource.has(block.parentBlockId),
      );
      if (index === -1) {
        throw templateError(
          "INVALID_BLOCK_TREE",
          "The page contains an invalid block tree",
        );
      }
      const [block] = unresolved.splice(index, 1);
      const parentTemplateBlockId = block.parentBlockId
        ? templateBlockBySource.get(block.parentBlockId)
        : undefined;
      const linkedTemplatePageId = block.linkedPageId
        ? templatePageBySource.get(block.linkedPageId)
        : undefined;
      if (block.type === "child_page" && !linkedTemplatePageId) {
        throw templateError(
          "CHILD_PAGE_UNAVAILABLE",
          "A sub-page block must point to a page inside the template tree",
        );
      }
      const templateBlockId = await ctx.db.insert("pageTemplateBlocks", {
        workspaceId,
        templateId,
        templatePageId,
        parentTemplateBlockId,
        type: block.type,
        order: block.order,
        text: block.text,
        checked: block.checked,
        url: block.url,
        color: block.color,
        propsJson: block.propsJson,
        alt: block.alt,
        caption: block.caption,
        dataSourceId: block.dataSourceId,
        viewId: block.viewId,
        syncGroupId: block.syncGroupId,
        linkedTemplatePageId,
      });
      templateBlockBySource.set(block._id, templateBlockId);
    }
  }
  return templateId;
}

export async function instantiatePageTemplate(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    templateId: Id<"pageTemplates">;
    parentDocument?: Id<"documents">;
    title?: string;
  },
) {
  await requireTemplate(ctx, workspaceId, args.templateId);
  if (args.parentDocument) {
    await requirePage(ctx, workspaceId, args.parentDocument);
  }
  const [templatePages, templateBlocks] = await Promise.all([
    ctx.db
      .query("pageTemplatePages")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .take(100),
    ctx.db
      .query("pageTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .take(5_000),
  ]);
  const roots = templatePages.filter((page) => !page.parentTemplatePageId);
  if (roots.length !== 1) {
    throw templateError(
      "INVALID_TEMPLATE_TREE",
      "Template must contain one root page",
    );
  }
  const title = args.title?.trim();
  if (title && title.length > 200) {
    throw templateError("INVALID_PAGE_TITLE", "Page title is too long");
  }

  const rootSiblings = await ctx.db
    .query("documents")
    .withIndex("by_user_parent_archived_data_source", (q) =>
      q
        .eq("userId", workspaceId)
        .eq("parentDocument", args.parentDocument)
        .eq("isArchived", false)
        .eq("dataSourceId", undefined),
    )
    .take(500);
  const unresolvedPages = [...templatePages];
  const documentByTemplatePage = new Map<string, Id<"documents">>();
  const now = Date.now();
  while (unresolvedPages.length) {
    const index = unresolvedPages.findIndex(
      (page) =>
        !page.parentTemplatePageId ||
        documentByTemplatePage.has(page.parentTemplatePageId),
    );
    if (index === -1) {
      throw templateError(
        "INVALID_TEMPLATE_TREE",
        "Template contains an invalid page tree",
      );
    }
    const [page] = unresolvedPages.splice(index, 1);
    const isRoot = page._id === roots[0]._id;
    const documentId = await ctx.db.insert("documents", {
      title: isRoot && title ? title : page.title,
      userId: workspaceId,
      parentDocument: isRoot
        ? args.parentDocument
        : documentByTemplatePage.get(page.parentTemplatePageId!),
      coverImage: page.coverImage,
      icon: page.icon,
      isArchived: false,
      isPublished: false,
      order: isRoot ? rootSiblings.length : page.order,
      updatedAt: now,
      fullWidth: page.fullWidth ?? true,
      smallText: page.smallText,
      showToc: page.showToc ?? true,
      kind: "page",
      contentModel: "page_blocks",
    });
    documentByTemplatePage.set(page._id, documentId);
  }

  const blocksByPage = new Map<string, Doc<"pageTemplateBlocks">[]>();
  for (const block of templateBlocks) {
    blocksByPage.set(block.templatePageId, [
      ...(blocksByPage.get(block.templatePageId) ?? []),
      block,
    ]);
  }
  for (const page of templatePages) {
    const pageId = documentByTemplatePage.get(page._id)!;
    const unresolvedBlocks = [...(blocksByPage.get(page._id) ?? [])];
    const blockByTemplateBlock = new Map<string, Id<"pageBlocks">>();
    while (unresolvedBlocks.length) {
      const index = unresolvedBlocks.findIndex(
        (block) =>
          !block.parentTemplateBlockId ||
          blockByTemplateBlock.has(block.parentTemplateBlockId),
      );
      if (index === -1) {
        throw templateError(
          "INVALID_BLOCK_TREE",
          "Template contains an invalid block tree",
        );
      }
      const [block] = unresolvedBlocks.splice(index, 1);
      if (block.dataSourceId || block.viewId) {
        const [source, view] = await Promise.all([
          block.dataSourceId ? ctx.db.get(block.dataSourceId) : null,
          block.viewId ? ctx.db.get(block.viewId) : null,
        ]);
        if (
          !source ||
          !view ||
          source.workspaceId !== workspaceId ||
          view.workspaceId !== workspaceId ||
          view.dataSourceId !== source._id
        ) {
          throw templateError(
            "LINKED_DATABASE_UNAVAILABLE",
            "A linked database view in this template is unavailable",
          );
        }
      }
      if (block.syncGroupId) {
        const syncGroup = await ctx.db.get(block.syncGroupId);
        if (!syncGroup || syncGroup.workspaceId !== workspaceId) {
          throw templateError(
            "SYNCED_SOURCE_UNAVAILABLE",
            "A synced block source in this template is unavailable",
          );
        }
      }
      const linkedPageId = block.linkedTemplatePageId
        ? documentByTemplatePage.get(block.linkedTemplatePageId)
        : undefined;
      if (block.type === "child_page" && !linkedPageId) {
        throw templateError(
          "CHILD_PAGE_UNAVAILABLE",
          "A sub-page block in this template has no cloned child page",
        );
      }
      const blockId = await ctx.db.insert("pageBlocks", {
        workspaceId,
        pageId,
        parentBlockId: block.parentTemplateBlockId
          ? blockByTemplateBlock.get(block.parentTemplateBlockId)
          : undefined,
        type: block.type,
        order: block.order,
        text: block.text,
        checked: block.checked,
        url: block.url,
        color: block.color,
        propsJson: block.propsJson,
        alt: block.alt,
        caption: block.caption,
        dataSourceId: block.dataSourceId,
        viewId: block.viewId,
        syncGroupId: block.syncGroupId,
        linkedPageId,
        createdAt: now,
        updatedAt: now,
      });
      blockByTemplateBlock.set(block._id, blockId);
    }
  }
  return {
    rootDocumentId: documentByTemplatePage.get(roots[0]._id)!,
    documentIds: [...documentByTemplatePage.values()],
  };
}

export async function removePageTemplate(
  ctx: MutationCtx,
  workspaceId: string,
  templateId: Id<"pageTemplates">,
) {
  await requireTemplate(ctx, workspaceId, templateId);
  const [pages, blocks] = await Promise.all([
    ctx.db
      .query("pageTemplatePages")
      .withIndex("by_template", (q) => q.eq("templateId", templateId))
      .take(100),
    ctx.db
      .query("pageTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", templateId))
      .take(5_000),
  ]);
  await Promise.all(blocks.map((block) => ctx.db.delete(block._id)));
  await Promise.all(pages.map((page) => ctx.db.delete(page._id)));
  await ctx.db.delete(templateId);
}
