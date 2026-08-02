import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getWorkspaceScope } from "./lib/workspace";
import { syncDatabaseName } from "./lib/databaseDomain";

const documentValidator = v.object({
  _id: v.id("documents"),
  _creationTime: v.number(),
  title: v.string(),
  userId: v.string(),
  isArchived: v.boolean(),
  parentDocument: v.optional(v.id("documents")),
  content: v.optional(v.string()),
  coverImage: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPublished: v.boolean(),
  order: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  isFavorite: v.optional(v.boolean()),
  editorFont: v.optional(v.string()),
  fullWidth: v.optional(v.boolean()),
  smallText: v.optional(v.boolean()),
  showToc: v.optional(v.boolean()),
  kind: v.optional(v.union(v.literal("page"), v.literal("database"))),
  dataSourceId: v.optional(v.id("dataSources")),
  contentModel: v.optional(
    v.union(v.literal("blocknote"), v.literal("page_blocks")),
  ),
});

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const exisingDocument = await ctx.db.get(args.id);

    if (!exisingDocument) {
      throw new Error("Document not found");
    }

    if (exisingDocument.userId !== userId) {
      throw new Error("Not authorized");
    }

    const recursiveArchive = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId),
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchived: true,
        });

        await recursiveArchive(child._id);
      }
    };

    const document = await ctx.db.patch(args.id, {
      isArchived: true,
    });

    await recursiveArchive(args.id);

    return document;
  },
});

export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  returns: v.array(documentValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const ordinaryChildren = await ctx.db
      .query("documents")
      .withIndex("by_user_parent_archived_data_source", (q) =>
        q
          .eq("userId", userId)
          .eq("parentDocument", args.parentDocument)
          .eq("isArchived", false)
          .eq("dataSourceId", undefined),
      )
      .order("desc")
      .take(500);

    const databaseRows: Doc<"documents">[] = [];

    if (args.parentDocument) {
      const parent = await ctx.db.get(args.parentDocument);

      if (!parent || parent.userId !== userId || parent.isArchived) {
        return [];
      }

      if (parent.kind === "database") {
        const dataSource = await ctx.db
          .query("dataSources")
          .withIndex("by_database_document", (q) =>
            q.eq("databaseDocumentId", parent._id),
          )
          .unique();

        if (dataSource?.workspaceId === userId) {
          const rows = await ctx.db
            .query("documents")
            .withIndex("by_user_and_data_source_and_archived", (q) =>
              q
                .eq("userId", userId)
                .eq("dataSourceId", dataSource._id)
                .eq("isArchived", false),
            )
            .take(500);

          databaseRows.push(
            ...rows.filter((row) => row.parentDocument === parent._id),
          );
        }
      }
    }

    const documents = Array.from(
      new Map(
        [...ordinaryChildren, ...databaseRows].map((document) => [
          document._id,
          document,
        ]),
      ).values(),
    );

    documents.sort((a, b) => {
      if (a.order === undefined && b.order === undefined) {
        return a._creationTime > b._creationTime ? -1 : 1;
      }
      if (a.order === undefined) return -1;
      if (b.order === undefined) return 1;

      return a.order - b.order;
    });

    return documents;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    if (args.parentDocument) {
      const parent = await ctx.db.get(args.parentDocument);

      if (!parent || parent.userId !== userId || parent.isArchived) {
        throw new Error("Parent document not found in this workspace");
      }
    }

    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      fullWidth: true,
      showToc: true,
      isArchived: false,
      isPublished: false,
      contentModel: "page_blocks",
    });

    const now = Date.now();
    await ctx.db.insert("pageBlocks", {
      workspaceId: userId,
      pageId: document,
      type: "paragraph",
      order: 0,
      text: "",
      createdAt: now,
      updatedAt: now,
    });

    return document;
  },
});

export const getTrash = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    return documents;
  },
});

export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const exisingDocument = await ctx.db.get(args.id);

    if (!exisingDocument) {
      throw new Error("Document not found");
    }

    if (exisingDocument.userId !== userId) {
      throw new Error("Not authorized");
    }

    const recursiveRestore = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId),
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchived: false,
        });

        await recursiveRestore(child._id);
      }
    };

    const options: Partial<Doc<"documents">> = {
      isArchived: false,
    };

    if (exisingDocument.parentDocument) {
      const parent = await ctx.db.get(exisingDocument.parentDocument);

      if (!parent || parent.userId !== userId || parent.isArchived) {
        options.parentDocument = undefined;
      }
    }

    const document = await ctx.db.patch(args.id, options);

    await recursiveRestore(args.id);

    return document;
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const exisingDocument = await ctx.db.get(args.id);

    if (!exisingDocument) {
      throw new Error("Document not found");
    }

    if (exisingDocument.userId !== userId) {
      throw new Error("Not authorized");
    }

    const blocks = await ctx.db
      .query("pageBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", args.id))
      .take(2_000);
    await Promise.all(blocks.map((block) => ctx.db.delete(block._id)));
    const document = await ctx.db.delete(args.id);

    return document;
  },
});

export const getSearch = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const document = await ctx.db.get(args.documentId);

    if (!document) {
      return null;
    }

    if (document.isPublished && !document.isArchived) {
      return document;
    }

    if (!identity) {
      return null;
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    if (document.userId !== userId) {
      return null;
    }

    return document;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    editorFont: v.optional(v.string()),
    fullWidth: v.optional(v.boolean()),
    smallText: v.optional(v.boolean()),
    showToc: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const { id, ...rest } = args;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    if (rest.title !== undefined) {
      await syncDatabaseName(ctx, userId, existingDocument, rest.title);
    }

    const document = await ctx.db.patch(args.id, {
      ...rest,
      updatedAt: Date.now(),
    });

    return document;
  },
});

export const removeIcon = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      icon: undefined,
      updatedAt: Date.now(),
    });

    return document;
  },
});

export const removeCoverImage = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      coverImage: undefined,
      updatedAt: Date.now(),
    });

    return document;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("documents"),
    parentDocument: v.optional(v.id("documents")),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    if (args.parentDocument) {
      const parent = await ctx.db.get(args.parentDocument);

      if (!parent || parent.userId !== userId || parent.isArchived) {
        throw new Error("Parent document not found in this workspace");
      }
    }

    const siblings = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument),
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    siblings.sort((a, b) => {
      if (a.order === undefined && b.order === undefined) return 0;
      if (a.order === undefined) return -1;
      if (b.order === undefined) return 1;
      return a.order - b.order;
    });

    const itemIndex = siblings.findIndex((sibling) => sibling._id === args.id);

    if (itemIndex === -1) {
      throw new Error("Document not found in this workspace");
    }

    const [movedItem] = siblings.splice(itemIndex, 1);
    siblings.splice(args.newOrder, 0, movedItem);

    await Promise.all(
      siblings.map((sibling, index) =>
        ctx.db.patch(sibling._id, {
          order: index,
        }),
      ),
    );

    return true;
  },
});

export const movePage = mutation({
  args: {
    id: v.id("documents"),
    targetId: v.id("documents"),
    placement: v.union(
      v.literal("before"),
      v.literal("after"),
      v.literal("inside"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = await getWorkspaceScope(ctx, identity.subject);
    if (args.id === args.targetId) return null;

    const [page, target] = await Promise.all([
      ctx.db.get(args.id),
      ctx.db.get(args.targetId),
    ]);
    if (
      !page ||
      !target ||
      page.userId !== userId ||
      target.userId !== userId ||
      page.isArchived ||
      target.isArchived ||
      page.dataSourceId ||
      target.dataSourceId
    ) {
      throw new Error("Page not found in this workspace");
    }

    const nextParent =
      args.placement === "inside" ? target._id : target.parentDocument;
    let ancestorId = nextParent;
    for (let depth = 0; ancestorId && depth < 100; depth += 1) {
      if (ancestorId === page._id) {
        throw new Error("A page cannot be moved inside itself or its children");
      }
      const ancestor = await ctx.db.get(ancestorId);
      if (!ancestor || ancestor.userId !== userId) {
        throw new Error("Destination page is unavailable");
      }
      ancestorId = ancestor.parentDocument;
    }
    if (ancestorId) throw new Error("Page nesting is too deep");

    const loadSiblings = async (parentDocument?: Id<"documents">) =>
      await ctx.db
        .query("documents")
        .withIndex("by_user_parent_archived_data_source", (q) =>
          q
            .eq("userId", userId)
            .eq("parentDocument", parentDocument)
            .eq("isArchived", false)
            .eq("dataSourceId", undefined),
        )
        .take(500);

    const destination = (await loadSiblings(nextParent))
      .filter((sibling) => sibling._id !== page._id)
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    const targetIndex = destination.findIndex(
      (sibling) => sibling._id === target._id,
    );
    const insertionIndex =
      args.placement === "inside"
        ? destination.length
        : Math.max(
            0,
            targetIndex + (args.placement === "after" ? 1 : 0),
          );
    destination.splice(insertionIndex, 0, page);

    const oldParent = page.parentDocument;
    await ctx.db.patch(page._id, { parentDocument: nextParent });
    await Promise.all(
      destination.map((sibling, order) =>
        ctx.db.patch(sibling._id, { order, updatedAt: Date.now() }),
      ),
    );

    if (oldParent !== nextParent) {
      const previousSiblings = (await loadSiblings(oldParent))
        .filter((sibling) => sibling._id !== page._id)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
      await Promise.all(
        previousSiblings.map((sibling, order) =>
          ctx.db.patch(sibling._id, { order, updatedAt: Date.now() }),
        ),
      );
    }
    return null;
  },
});

export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();

    const promises = documents.map((document) => ctx.db.delete(document._id));
    await Promise.all(promises);
    return true;
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      isFavorite: !existingDocument.isFavorite,
    });

    return document;
  },
});

export const getFavorites = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await getWorkspaceScope(ctx, identity.subject);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isFavorite"), true),
          q.eq(q.field("isArchived"), false),
        ),
      )
      .order("desc")
      .collect();

    return documents;
  },
});
