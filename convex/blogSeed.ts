import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { createDatabase } from "./lib/databaseDomain";

const ADMIN_EMAIL = "ahmedmansour20251@icloud.com";

export const seed = internalMutation({
  args: {
    contentTokenHash: v.string(),
    contentTokenPrefix: v.string(),
    mcpTokenHash: v.string(),
    mcpTokenPrefix: v.string(),
  },
  returns: v.object({
    dataSourceId: v.id("dataSources"),
    contentApiKeyId: v.id("contentApiKeys"),
    mcpEnvironmentId: v.id("mcpEnvironments"),
  }),
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query("entitlementGrants")
      .withIndex("by_email", (q) => q.eq("email", ADMIN_EMAIL))
      .order("desc")
      .first();
    if (!grant || grant.status !== "active") {
      throw new Error("Seed the verified Apple admin grant first");
    }

    const existingSource = await ctx.db
      .query("dataSources")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", grant.ownerUserId))
      .take(100)
      .then((sources) => sources.find((source) => source.name === "Blogs"));
    if (existingSource) {
      const existingKey = await ctx.db
        .query("contentApiKeys")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", grant.ownerUserId),
        )
        .take(50)
        .then((keys) => keys.find((key) => key.name === "Nexfiy Blog"));
      const existingMcp = await ctx.db
        .query("mcpEnvironments")
        .withIndex("by_owner", (q) => q.eq("ownerId", grant.ownerUserId))
        .take(50)
        .then((items) => items.find((item) => item.name === "Nexfiy Codex"));
      if (existingKey && existingMcp) {
        return {
          dataSourceId: existingSource._id,
          contentApiKeyId: existingKey._id,
          mcpEnvironmentId: existingMcp._id,
        };
      }
      throw new Error("Blogs exists but its scoped credentials are incomplete");
    }

    const now = Date.now();
    const database = await createDatabase(ctx, grant.ownerUserId, {
      title: "Blogs",
    });
    const statusNames = ["Draft", "Review", "Published"];
    for (const [index, optionId] of database.statusOptionIds.entries()) {
      await ctx.db.patch(optionId, { name: statusNames[index] });
    }

    const propertySpecs = [
      ["Slug", "text"],
      ["Excerpt", "text"],
      ["Published date", "date"],
      ["Cover image", "url"],
      ["Author", "text"],
      ["Tags", "multi_select"],
    ] as const;
    const propertyIds = new Map<string, typeof database.titlePropertyId>();
    for (const [index, [name, type]] of propertySpecs.entries()) {
      const id = await ctx.db.insert("databaseProperties", {
        workspaceId: grant.ownerUserId,
        dataSourceId: database.dataSourceId,
        name,
        type,
        order: index + 2,
        createdAt: now,
        updatedAt: now,
      });
      propertyIds.set(name, id);
    }
    const tagPropertyId = propertyIds.get("Tags")!;
    const tagNames = ["Product", "Guides", "MCP", "API"];
    const tagIds = new Map<string, (typeof database.statusOptionIds)[number]>();
    for (const [order, name] of tagNames.entries()) {
      const id = await ctx.db.insert("databaseSelectOptions", {
        workspaceId: grant.ownerUserId,
        dataSourceId: database.dataSourceId,
        propertyId: tagPropertyId,
        name,
        color: ["blue", "yellow", "orange", "green"][order],
        order,
      });
      tagIds.set(name, id);
    }
    await ctx.db.patch(database.viewId, {
      visiblePropertyIds: [
        database.titlePropertyId,
        database.statusPropertyId,
        ...propertyIds.values(),
      ],
    });

    const posts = [
      {
        title: "From a note to a working system",
        slug: "from-a-note-to-a-working-system",
        excerpt:
          "How Nexfiy turns calm writing into structured knowledge that pages, APIs, and tools can share.",
        tags: ["Product", "API", "MCP"],
      },
      {
        title: "Designing a Content API for real work",
        slug: "designing-a-content-api-for-real-work",
        excerpt:
          "A practical look at scoped keys, normalized blocks, and publishing without duplicating content.",
        tags: ["Guides", "API"],
      },
      {
        title: "Give your tools the right context",
        slug: "give-your-tools-the-right-context",
        excerpt:
          "Connect an MCP client to the same workspace your team already understands.",
        tags: ["Guides", "MCP"],
      },
    ];
    const postIds = [];
    for (const [postIndex, post] of posts.entries()) {
      const documentId = await ctx.db.insert("documents", {
        title: post.title,
        userId: grant.ownerUserId,
        parentDocument: database.documentId,
        dataSourceId: database.dataSourceId,
        kind: "page",
        contentModel: "page_blocks",
        isArchived: false,
        isPublished: true,
        order: postIndex,
        updatedAt: now - postIndex * 86_400_000,
      });
      postIds.push(documentId);
      const values = [
        {
          name: "Slug",
          type: "text" as const,
          textValue: post.slug,
          sortKey: post.slug,
        },
        {
          name: "Excerpt",
          type: "text" as const,
          textValue: post.excerpt,
          sortKey: post.excerpt.toLowerCase(),
        },
        {
          name: "Published date",
          type: "date" as const,
          dateStart: now - postIndex * 86_400_000,
          sortKey: String(now - postIndex * 86_400_000).padStart(16, "0"),
        },
        {
          name: "Cover image",
          type: "url" as const,
          textValue: "https://nexfiy.com/social/opengraph.png",
          sortKey: "https://nexfiy.com/social/opengraph.png",
        },
        {
          name: "Author",
          type: "text" as const,
          textValue: "Ahmed Mansour",
          sortKey: "ahmed mansour",
        },
        {
          name: "Tags",
          type: "multi_select" as const,
          optionIds: post.tags.map((tag) => tagIds.get(tag)!),
          sortKey: post.tags.join(":"),
        },
      ];
      await ctx.db.insert("databasePropertyValues", {
        workspaceId: grant.ownerUserId,
        dataSourceId: database.dataSourceId,
        documentId,
        propertyId: database.statusPropertyId,
        type: "status",
        optionIds: [database.statusOptionIds[2]],
        sortKey: database.statusOptionIds[2],
        updatedAt: now,
      });
      for (const value of values) {
        await ctx.db.insert("databasePropertyValues", {
          workspaceId: grant.ownerUserId,
          dataSourceId: database.dataSourceId,
          documentId,
          propertyId: propertyIds.get(value.name)!,
          type: value.type,
          textValue: "textValue" in value ? value.textValue : undefined,
          dateStart: "dateStart" in value ? value.dateStart : undefined,
          optionIds: "optionIds" in value ? value.optionIds : undefined,
          sortKey: value.sortKey,
          updatedAt: now,
        });
      }
    }

    const blockSpecs = [
      ["heading_1", "Connected content starts as ordinary writing."],
      [
        "paragraph",
        "A page should feel calm to write and structured enough for software to understand.",
      ],
      ["heading_2", "One source, several useful views"],
      ["bulleted_list", "Write and edit the source in Nexfiy."],
      ["numbered_list", "Select exactly which database an API key can read."],
      ["checklist", "Keep drafts private until they are ready."],
      ["quote", "Good structure should support the work, not interrupt it."],
      ["callout", "This article is rendered from Nexfiy's own Content API."],
      ["toggle", "The same normalized blocks are available to MCP clients."],
      ["divider", ""],
      ["image", "Nexfiy connected workspace"],
      ["bookmark", "A useful video embed"],
      ["bookmark", "GitHub repository"],
      ["file", "Download the API guide"],
      ["database_view", "Blogs"],
      ["child_page", posts[1].title],
      ["synced_reference", "Shared launch note"],
      ["blocknote", "A code example"],
    ] as const;
    for (const [order, [type, text]] of blockSpecs.entries()) {
      await ctx.db.insert("pageBlocks", {
        workspaceId: grant.ownerUserId,
        pageId: postIds[0],
        type,
        order,
        text,
        checked: type === "checklist" ? true : undefined,
        url:
          type === "image"
            ? "https://nexfiy.com/social/linkedin.png"
            : type === "bookmark" && text.includes("video")
              ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              : type === "bookmark"
                ? "https://github.com/Up-to-code/notion-clone"
                : type === "file"
                  ? "https://nexfiy.com/docs/content-api/quickstart"
                  : undefined,
        propsJson:
          type === "blocknote"
            ? JSON.stringify({
                language: "typescript",
                code: "const posts = await nexfiy.blog.list();",
              })
            : undefined,
        dataSourceId:
          type === "database_view" ? database.dataSourceId : undefined,
        viewId: type === "database_view" ? database.viewId : undefined,
        linkedPageId: type === "child_page" ? postIds[1] : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (let index = 1; index < postIds.length; index += 1) {
      await ctx.db.insert("pageBlocks", {
        workspaceId: grant.ownerUserId,
        pageId: postIds[index],
        type: "paragraph",
        order: 0,
        text: posts[index].excerpt,
        createdAt: now,
        updatedAt: now,
      });
    }

    const contentApiKeyId = await ctx.db.insert("contentApiKeys", {
      workspaceId: grant.ownerUserId,
      createdById: grant.ownerUserId,
      billingOwnerId: grant.ownerUserId,
      name: "Nexfiy Blog",
      tokenHash: args.contentTokenHash,
      tokenPrefix: args.contentTokenPrefix,
      dataSourceIds: [database.dataSourceId],
      isEnabled: true,
      createdAt: now,
    });
    const mcpEnvironmentId = await ctx.db.insert("mcpEnvironments", {
      ownerId: grant.ownerUserId,
      billingOwnerId: grant.ownerUserId,
      workspaceId: grant.ownerUserId,
      name: "Nexfiy Codex",
      tokenHash: args.mcpTokenHash,
      tokenPrefix: args.mcpTokenPrefix,
      isEnabled: true,
    });
    return {
      dataSourceId: database.dataSourceId,
      contentApiKeyId,
      mcpEnvironmentId,
    };
  },
});
