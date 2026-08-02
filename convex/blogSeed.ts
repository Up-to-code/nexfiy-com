import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { createDatabase } from "./lib/databaseDomain";

const ADMIN_EMAIL = "ahmedmansour20251@icloud.com";

const EDITORIAL_POSTS = [
  {
    title: "Nexfiy vs Notion: which workspace fits product teams?",
    slug: "nexfiy-vs-notion",
    excerpt:
      "A practical comparison of writing, databases, publishing, APIs, and MCP—plus the situations where each workspace is the better choice.",
    coverImage: "https://www.nexfiy.com/blog/nexfiy-vs-notion.jpg",
    tags: ["Product", "Guides", "MCP", "API"],
    blocks: [
      {
        type: "paragraph",
        text: "Notion and Nexfiy start from the same useful idea: a page should be simple enough for a note and structured enough for a team. The difference appears when that knowledge must power a product, an API, or an AI agent—not only a workspace.",
      },
      {
        type: "callout",
        text: "Short answer: choose Notion for the broadest mature collaboration ecosystem. Choose Nexfiy when pages, databases, product content, scoped APIs, and MCP tools need to share one live source of truth.",
      },
      { type: "heading_1", text: "Where Notion is stronger" },
      {
        type: "paragraph",
        text: "Notion is the safer default for a large organization that values a mature template market, a wide integration catalog, polished collaboration, and familiar adoption. Its databases support many views, relations, rollups, forms, charts, and automations. Notion Sites also makes publishing a page straightforward, with custom domains available as a paid add-on.",
      },
      {
        type: "bookmark",
        text: "Notion's official database overview",
        url: "https://www.notion.com/help/category/databases",
      },
      { type: "heading_1", text: "Where Nexfiy is different" },
      {
        type: "paragraph",
        text: "Nexfiy treats a page as both a human workspace and a programmable content object. A team can write normally, organize rows in table, pipeline, calendar, or timeline views, publish selected pages, expose selected databases through scoped Content API keys, and connect an MCP client to the same workspace.",
      },
      {
        type: "paragraph",
        text: "That removes a common handoff: the product team no longer has to copy approved content from a planning tool into a separate CMS before a website or application can use it. The database row is already a page; its properties are already structured; the public surface reads the same source.",
      },
      { type: "heading_2", text: "API and automation model" },
      {
        type: "paragraph",
        text: "Notion has a capable public API and official webhooks. Its webhook events act as change signals, and an integration then fetches the updated content. Nexfiy's Content API is designed around database-scoped read keys, while its MCP environment gives compatible AI clients discoverable tools for reading and changing permitted workspace content.",
      },
      {
        type: "bookmark",
        text: "Notion's official webhook documentation",
        url: "https://developers.notion.com/reference/webhooks",
      },
      { type: "heading_2", text: "Choose by the work, not the checklist" },
      {
        type: "bulleted_list",
        text: "Choose Notion when ecosystem breadth, templates, and organization-wide familiarity matter most.",
      },
      {
        type: "bulleted_list",
        text: "Choose Nexfiy when the same content must serve teammates, a website, product UI, external tools, and AI clients.",
      },
      {
        type: "bulleted_list",
        text: "Keep a dedicated headless CMS when localization, asset pipelines, editorial governance, or high-scale delivery are the central requirements.",
      },
      { type: "heading_1", text: "The practical verdict" },
      {
        type: "paragraph",
        text: "Nexfiy is not trying to win by copying every Notion surface. Its advantage is architectural: one connected workspace can remain pleasant for writers while becoming directly useful to software and agents. For a product team building a content-powered application, that narrower focus can remove an entire system from the stack.",
      },
    ],
  },
  {
    title: "The best Notion alternatives in 2026",
    slug: "best-notion-alternatives-2026",
    excerpt:
      "The strongest Notion alternatives ranked by actual use case—from product content and MCP to projects, wikis, offline work, and self-hosting.",
    coverImage: "https://www.nexfiy.com/blog/best-notion-alternatives-2026.jpg",
    tags: ["Product", "Guides"],
    blocks: [
      {
        type: "paragraph",
        text: "There is no universal best Notion alternative. A team replacing a wiki has a different problem from a team publishing product content, managing engineering projects, or requiring local-first storage. The useful comparison starts with the job.",
      },
      {
        type: "callout",
        text: "Our pick for a connected product workspace is Nexfiy. For other priorities, Coda, ClickUp, Confluence, Slite, and AFFiNE can be better choices.",
      },
      {
        type: "heading_1",
        text: "1. Nexfiy — best for connected product content",
      },
      {
        type: "paragraph",
        text: "Nexfiy combines documents, database views, publishing, a scoped Content API, and MCP access. It is the strongest fit when knowledge should not stop at the workspace boundary: a product can read the same structured content that a team edits, while an authorized AI client can work through discoverable tools.",
      },
      { type: "heading_1", text: "2. Coda — best for interactive team docs" },
      {
        type: "paragraph",
        text: "Coda is a strong alternative for teams that want documents to behave like small applications. Its formulas, buttons, packs, and structured tables suit operational workflows where people interact with the doc itself.",
      },
      { type: "heading_1", text: "3. ClickUp — best for project execution" },
      {
        type: "paragraph",
        text: "ClickUp is better when tasks, workload, reporting, and project operations are the center of gravity. Its docs complement a larger work-management system rather than acting as the primary content platform.",
      },
      {
        type: "heading_1",
        text: "4. Confluence — best for established enterprise knowledge",
      },
      {
        type: "paragraph",
        text: "Confluence remains compelling for organizations already standardized on Jira and Atlassian administration. It favors governed team knowledge, permissions, and established enterprise workflows over a lightweight personal workspace feel.",
      },
      { type: "heading_1", text: "5. Slite — best for a focused team wiki" },
      {
        type: "paragraph",
        text: "Slite deliberately narrows the product around team knowledge, search, and documentation. Choose it when a calm wiki is more valuable than building databases, internal applications, or public content infrastructure.",
      },
      {
        type: "heading_1",
        text: "6. AFFiNE — best for local-first and open source",
      },
      {
        type: "paragraph",
        text: "AFFiNE is worth evaluating when local-first work, an open-source codebase, and a blend of document and whiteboard interaction matter. As with any younger platform, validate collaboration, migration, and administration against your real workflow.",
      },
      { type: "heading_2", text: "How to choose in one afternoon" },
      {
        type: "numbered_list",
        text: "List the three workflows that must improve—not every feature you currently use.",
      },
      {
        type: "numbered_list",
        text: "Rebuild one real project, including permissions, linked data, and a publishing or automation step.",
      },
      {
        type: "numbered_list",
        text: "Test export and API access before importing the whole workspace.",
      },
      {
        type: "paragraph",
        text: "If your deciding workflow is product content, test Nexfiy first. If it is project execution, start with ClickUp. If it is enterprise documentation, test Confluence. If ownership and local-first storage lead the decision, start with AFFiNE.",
      },
    ],
  },
  {
    title: "The best CMS for product teams in 2026",
    slug: "best-cms-for-product-teams-2026",
    excerpt:
      "A use-case guide to Nexfiy, Sanity, Contentful, Strapi, and Webflow—with a clear answer for product content, marketing sites, and enterprise delivery.",
    coverImage: "https://www.nexfiy.com/blog/best-cms-product-teams-2026.jpg",
    tags: ["Product", "Guides", "API"],
    blocks: [
      {
        type: "paragraph",
        text: "The best CMS is the one that matches the content operating model. A marketing site needs visual control. A global content platform needs localization and governance. A product team may need release notes, prompts, help content, configuration, and internal knowledge to move together.",
      },
      {
        type: "callout",
        text: "Best for connected product teams: Nexfiy. Best for highly modeled real-time content: Sanity. Best for enterprise content infrastructure: Contentful. Best for self-hosted control: Strapi. Best for a visually built marketing site: Webflow.",
      },
      {
        type: "heading_1",
        text: "Nexfiy — best when the workspace is the CMS",
      },
      {
        type: "paragraph",
        text: "Nexfiy is our first recommendation when product knowledge and shipped content belong in the same workflow. Writers work in pages and databases; developers select a database, issue a scoped Content API key, and render the result in a website or application. MCP access adds a controlled path for compatible AI tools to inspect and maintain the same source.",
      },
      {
        type: "heading_1",
        text: "Sanity — best for flexible, live structured content",
      },
      {
        type: "paragraph",
        text: "Sanity is a strong developer-led choice when content models are deeply customized and live delivery matters. Its Content Lake and Live Content API support targeted updates, while Sanity Studio can be shaped around specialized editorial workflows.",
      },
      {
        type: "bookmark",
        text: "Sanity Live Content API documentation",
        url: "https://www.sanity.io/docs/content-lake/live-content-api",
      },
      { type: "heading_1", text: "Contentful — best for enterprise delivery" },
      {
        type: "paragraph",
        text: "Contentful separates content management, preview, delivery, images, and GraphQL into dedicated APIs. That breadth is valuable for multi-brand, multi-locale, multi-channel programs with established governance and infrastructure budgets.",
      },
      {
        type: "bookmark",
        text: "Contentful API overview",
        url: "https://www.contentful.com/developers/docs/references/api-basics/",
      },
      { type: "heading_1", text: "Strapi — best for self-hosted control" },
      {
        type: "paragraph",
        text: "Strapi is the practical choice when an engineering team wants an open-source Node.js CMS, REST and GraphQL APIs, infrastructure control, and the freedom to extend backend behavior. The tradeoff is operational responsibility.",
      },
      {
        type: "heading_1",
        text: "Webflow — best for visual marketing production",
      },
      {
        type: "paragraph",
        text: "Webflow is strongest when the website and its visual composition are the product being managed. Designers can build and publish without creating a separate frontend. It is less natural when the same content must power many product surfaces with complex domain models.",
      },
      { type: "heading_2", text: "A decision rule that survives demos" },
      {
        type: "paragraph",
        text: "Choose based on the hardest content operation: product-team collaboration points to Nexfiy; schema depth and live content point to Sanity; enterprise governance points to Contentful; infrastructure ownership points to Strapi; visual site ownership points to Webflow. Then prototype one complete publish cycle before committing.",
      },
    ],
  },
  {
    title: "Notion as a CMS vs Nexfiy's Content API",
    slug: "notion-cms-vs-nexfiy-content-api",
    excerpt:
      "You can publish from Notion, but should it run your product content? Compare the integration model with Nexfiy's database-scoped Content API.",
    coverImage:
      "https://www.nexfiy.com/blog/notion-cms-vs-nexfiy-content-api.jpg",
    tags: ["Guides", "API", "Product"],
    blocks: [
      {
        type: "paragraph",
        text: "Notion can absolutely act as a lightweight CMS. Teams already write there, database properties make useful metadata, the API can retrieve pages, and webhooks can signal changes. For a simple blog or directory, that can be enough.",
      },
      { type: "heading_1", text: "What a Notion CMS integration needs" },
      {
        type: "paragraph",
        text: "A production integration normally needs an internal or public Notion integration, page permissions, a mapping from Notion blocks to frontend components, caching, image handling, preview rules, and a webhook endpoint. The webhook payload signals that something changed; your service then retrieves the latest content.",
      },
      {
        type: "bookmark",
        text: "Notion webhook event delivery",
        url: "https://developers.notion.com/reference/webhooks-events-delivery",
      },
      {
        type: "heading_1",
        text: "How Nexfiy's Content API changes the boundary",
      },
      {
        type: "paragraph",
        text: "In Nexfiy, the database is explicitly selected when a Content API key is created. The key reads the schema, rows, values, and normalized page blocks for that source. Draft and published status remain editable in the same database that the product team uses.",
      },
      {
        type: "paragraph",
        text: "That database scope is the important product decision. A website does not receive access to an entire workspace, and a team does not maintain a second copy solely for delivery. The public blog you are reading is rendered from the same Nexfiy database shown in the workspace.",
      },
      { type: "heading_2", text: "Where Notion remains a good CMS" },
      {
        type: "bulleted_list",
        text: "The team already lives in Notion and the content model is small.",
      },
      {
        type: "bulleted_list",
        text: "A developer is comfortable owning block conversion, caching, and webhook handling.",
      },
      {
        type: "bulleted_list",
        text: "The website is the only delivery destination and deep editorial governance is unnecessary.",
      },
      { type: "heading_2", text: "Where Nexfiy is the cleaner fit" },
      {
        type: "bulleted_list",
        text: "Content also belongs inside a product, documentation surface, or AI workflow.",
      },
      {
        type: "bulleted_list",
        text: "The team wants database-scoped credentials rather than a broad workspace integration.",
      },
      {
        type: "bulleted_list",
        text: "Pages, structured properties, public publishing, Content API reads, and MCP actions should remain one system.",
      },
      { type: "heading_1", text: "The conclusion" },
      {
        type: "paragraph",
        text: "Use Notion as a CMS when convenience outweighs integration ownership. Use Nexfiy when content delivery is a first-class part of the workspace architecture. Use a dedicated headless CMS when advanced localization, asset operations, and enterprise governance dominate the project.",
      },
    ],
  },
  {
    title: "How to manage product content with MCP safely",
    slug: "manage-product-content-with-mcp",
    excerpt:
      "A practical architecture for letting Codex, Claude, and other MCP clients work with product content without handing them the whole workspace.",
    coverImage: "https://www.nexfiy.com/blog/mcp-product-content.jpg",
    tags: ["MCP", "API", "Guides"],
    blocks: [
      {
        type: "paragraph",
        text: "MCP makes product content actionable. Instead of pasting pages into a chat, a compatible client can discover tools, read current context, and perform permitted operations. The opportunity is real—but so is the need for a clear control boundary.",
      },
      {
        type: "callout",
        text: "The safe pattern is not 'give the model the database.' It is: authenticate the client, expose narrow tools, validate every operation on the server, keep the human-visible source current, and record what happened.",
      },
      { type: "heading_1", text: "Start with the protocol boundary" },
      {
        type: "paragraph",
        text: "MCP uses a client-server architecture. A remote server commonly uses Streamable HTTP, while the protocol's data layer exposes tools, resources, prompts, and notifications over JSON-RPC. Capability discovery lets a client understand what the server offers before invoking anything.",
      },
      {
        type: "bookmark",
        text: "Official MCP architecture overview",
        url: "https://modelcontextprotocol.io/docs/learn/architecture",
      },
      { type: "heading_1", text: "Five controls that matter" },
      {
        type: "numbered_list",
        text: "Use a separate environment or token for each client and workspace purpose.",
      },
      {
        type: "numbered_list",
        text: "Authorize on the server for every tool call; never trust a workspace ID supplied by the client.",
      },
      {
        type: "numbered_list",
        text: "Expose domain operations such as publish page or update status instead of unrestricted database access.",
      },
      {
        type: "numbered_list",
        text: "Make writes idempotent and return useful errors so retries cannot duplicate content.",
      },
      {
        type: "numbered_list",
        text: "Keep an activity record and require explicit confirmation for destructive or high-impact actions.",
      },
      { type: "heading_2", text: "Authentication is part of the product" },
      {
        type: "paragraph",
        text: "For HTTP transports, the MCP authorization specification follows OAuth conventions and recommends least-privilege access. Bearer tokens and API keys can work for controlled environments, but they still need secure storage, revocation, HTTPS, and server-side scope checks.",
      },
      {
        type: "bookmark",
        text: "Official MCP authorization guidance",
        url: "https://modelcontextprotocol.io/docs/tutorials/security/authorization",
      },
      { type: "heading_1", text: "Why a connected workspace helps" },
      {
        type: "paragraph",
        text: "When MCP tools operate on the same pages and databases that people see, review becomes ordinary product work. A content editor can inspect the updated row, compare properties, use database views to spot changes, and publish from the same source. There is no hidden agent-only copy to reconcile later.",
      },
      {
        type: "paragraph",
        text: "Nexfiy's model is designed for this loop: visible workspace state, scoped access, discoverable MCP tools, server-side authorization, and live updates. The goal is not to remove people from content operations. It is to let people delegate repeatable work without losing control of the source.",
      },
    ],
  },
] as const;

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

    const posts = EDITORIAL_POSTS;
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
          textValue: post.coverImage,
          sortKey: post.coverImage,
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

    for (const [postIndex, post] of posts.entries()) {
      for (const [order, block] of post.blocks.entries()) {
        await ctx.db.insert("pageBlocks", {
          workspaceId: grant.ownerUserId,
          pageId: postIds[postIndex],
          type: block.type,
          order,
          text: block.text,
          url: "url" in block ? block.url : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
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

export const replaceEditorialCollection = internalMutation({
  args: {},
  returns: v.object({
    dataSourceId: v.id("dataSources"),
    removedPosts: v.number(),
    createdPosts: v.number(),
    createdBlocks: v.number(),
  }),
  handler: async (ctx) => {
    const grant = await ctx.db
      .query("entitlementGrants")
      .withIndex("by_email", (q) => q.eq("email", ADMIN_EMAIL))
      .order("desc")
      .first();
    if (!grant || grant.status !== "active") {
      throw new Error("The verified admin workspace is unavailable");
    }

    const dataSource = await ctx.db
      .query("dataSources")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", grant.ownerUserId))
      .take(100)
      .then((sources) => sources.find((source) => source.name === "Blogs"));
    if (!dataSource) {
      throw new Error("Create the Blogs collection before replacing its posts");
    }

    const databaseDocument = await ctx.db.get(dataSource.databaseDocumentId);
    if (
      !databaseDocument ||
      databaseDocument.userId !== grant.ownerUserId ||
      databaseDocument.isArchived
    ) {
      throw new Error("The Blogs database document is unavailable");
    }

    const properties = await ctx.db
      .query("databaseProperties")
      .withIndex("by_data_source", (q) => q.eq("dataSourceId", dataSource._id))
      .take(50);
    const propertyByName = new Map(
      properties.map((property) => [property.name, property]),
    );
    const statusProperty = propertyByName.get("Status");
    const tagProperty = propertyByName.get("Tags");
    if (!statusProperty || !tagProperty) {
      throw new Error("The Blogs status and tag properties are required");
    }

    const requiredPropertyNames = [
      "Slug",
      "Excerpt",
      "Published date",
      "Cover image",
      "Author",
      "Tags",
    ] as const;
    for (const name of requiredPropertyNames) {
      if (!propertyByName.has(name)) {
        throw new Error(`The Blogs property ${name} is required`);
      }
    }

    const [statusOptions, tagOptions] = await Promise.all([
      ctx.db
        .query("databaseSelectOptions")
        .withIndex("by_property", (q) => q.eq("propertyId", statusProperty._id))
        .take(20),
      ctx.db
        .query("databaseSelectOptions")
        .withIndex("by_property", (q) => q.eq("propertyId", tagProperty._id))
        .take(50),
    ]);
    const publishedOption = statusOptions.find(
      (option) => option.name === "Published",
    );
    if (!publishedOption) {
      throw new Error("The Blogs Published status is required");
    }
    const tagOptionByName = new Map(
      tagOptions.map((option) => [option.name, option._id]),
    );
    for (const post of EDITORIAL_POSTS) {
      for (const tag of post.tags) {
        if (!tagOptionByName.has(tag)) {
          throw new Error(`The Blogs tag ${tag} is required`);
        }
      }
    }

    const existingPosts = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q
          .eq("userId", grant.ownerUserId)
          .eq("parentDocument", databaseDocument._id),
      )
      .take(500)
      .then((documents) =>
        documents.filter(
          (document) => document.dataSourceId === dataSource._id,
        ),
      );

    for (const post of existingPosts) {
      const [blocks, values] = await Promise.all([
        ctx.db
          .query("pageBlocks")
          .withIndex("by_page", (q) => q.eq("pageId", post._id))
          .take(500),
        ctx.db
          .query("databasePropertyValues")
          .withIndex("by_document", (q) => q.eq("documentId", post._id))
          .take(100),
      ]);
      await Promise.all([
        ...blocks.map((block) => ctx.db.delete(block._id)),
        ...values.map((value) => ctx.db.delete(value._id)),
      ]);
      await ctx.db.delete(post._id);
    }

    const now = Date.now();
    let createdBlocks = 0;
    for (const [postIndex, post] of EDITORIAL_POSTS.entries()) {
      const publishedAt = now - postIndex * 86_400_000;
      const documentId = await ctx.db.insert("documents", {
        title: post.title,
        userId: grant.ownerUserId,
        parentDocument: databaseDocument._id,
        dataSourceId: dataSource._id,
        kind: "page",
        contentModel: "page_blocks",
        isArchived: false,
        isPublished: true,
        order: postIndex,
        updatedAt: publishedAt,
      });

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
          dateStart: publishedAt,
          sortKey: String(publishedAt).padStart(16, "0"),
        },
        {
          name: "Cover image",
          type: "url" as const,
          textValue: post.coverImage,
          sortKey: post.coverImage,
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
          optionIds: post.tags.map((tag) => tagOptionByName.get(tag)!),
          sortKey: post.tags.join(":"),
        },
      ];
      await ctx.db.insert("databasePropertyValues", {
        workspaceId: grant.ownerUserId,
        dataSourceId: dataSource._id,
        documentId,
        propertyId: statusProperty._id,
        type: "status",
        optionIds: [publishedOption._id],
        sortKey: publishedOption._id,
        updatedAt: now,
      });
      for (const value of values) {
        await ctx.db.insert("databasePropertyValues", {
          workspaceId: grant.ownerUserId,
          dataSourceId: dataSource._id,
          documentId,
          propertyId: propertyByName.get(value.name)!._id,
          type: value.type,
          textValue: "textValue" in value ? value.textValue : undefined,
          dateStart: "dateStart" in value ? value.dateStart : undefined,
          optionIds: "optionIds" in value ? value.optionIds : undefined,
          sortKey: value.sortKey,
          updatedAt: now,
        });
      }

      for (const [order, block] of post.blocks.entries()) {
        await ctx.db.insert("pageBlocks", {
          workspaceId: grant.ownerUserId,
          pageId: documentId,
          type: block.type,
          order,
          text: block.text,
          url: "url" in block ? block.url : undefined,
          createdAt: now,
          updatedAt: now,
        });
        createdBlocks += 1;
      }
    }

    await Promise.all([
      ctx.db.patch(dataSource._id, { updatedAt: now }),
      ctx.db.patch(databaseDocument._id, { updatedAt: now }),
    ]);

    return {
      dataSourceId: dataSource._id,
      removedPosts: existingPosts.length,
      createdPosts: EDITORIAL_POSTS.length,
      createdBlocks,
    };
  },
});
