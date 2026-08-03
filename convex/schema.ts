import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaceAliases: defineTable({
    organizationId: v.string(),
    workspaceId: v.string(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_workspace", ["workspaceId"]),

  documents: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"])
    .index("by_user_parent_archived_data_source", [
      "userId",
      "parentDocument",
      "isArchived",
      "dataSourceId",
    ])
    .index("by_user_and_archived", ["userId", "isArchived"])
    .index("by_user_and_data_source_and_archived", [
      "userId",
      "dataSourceId",
      "isArchived",
    ])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "isArchived"],
    }),

  pageBlocks: defineTable({
    workspaceId: v.string(),
    pageId: v.id("documents"),
    parentBlockId: v.optional(v.id("pageBlocks")),
    type: v.union(
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
    ),
    editorId: v.optional(v.string()),
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
    linkedPageId: v.optional(v.id("documents")),
    syncGroupId: v.optional(v.id("syncedBlockGroups")),
    lastSplitOperationId: v.optional(v.string()),
    lastSplitResultBlockId: v.optional(v.id("pageBlocks")),
    creationOperationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_page", ["pageId"])
    .index("by_page_and_parent", ["pageId", "parentBlockId"])
    .index("by_page_and_editor_id", ["pageId", "editorId"])
    .index("by_sync_group", ["syncGroupId"])
    .index("by_linked_page", ["linkedPageId"])
    .index("by_workspace_and_creation_operation", [
      "workspaceId",
      "creationOperationId",
    ])
    .index("by_workspace", ["workspaceId"]),

  syncedBlockGroups: defineTable({
    workspaceId: v.string(),
    sourcePageId: v.id("documents"),
    sourceRootBlockId: v.id("pageBlocks"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_source_root_block", ["sourceRootBlockId"]),

  pageTemplates: defineTable({
    workspaceId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    pageCount: v.number(),
    blockCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  pageTemplatePages: defineTable({
    workspaceId: v.string(),
    templateId: v.id("pageTemplates"),
    parentTemplatePageId: v.optional(v.id("pageTemplatePages")),
    title: v.string(),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    fullWidth: v.optional(v.boolean()),
    smallText: v.optional(v.boolean()),
    showToc: v.optional(v.boolean()),
    order: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_template_and_parent", ["templateId", "parentTemplatePageId"])
    .index("by_workspace", ["workspaceId"]),

  pageTemplateBlocks: defineTable({
    workspaceId: v.string(),
    templateId: v.id("pageTemplates"),
    templatePageId: v.id("pageTemplatePages"),
    parentTemplateBlockId: v.optional(v.id("pageTemplateBlocks")),
    type: v.union(
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
    ),
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
    linkedTemplatePageId: v.optional(v.id("pageTemplatePages")),
  })
    .index("by_template", ["templateId"])
    .index("by_template_page", ["templatePageId"])
    .index("by_workspace", ["workspaceId"]),

  databaseRowTemplates: defineTable({
    workspaceId: v.string(),
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    isDefault: v.boolean(),
    initialValues: v.array(
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
    blocks: v.array(
      v.object({
        type: v.string(),
        order: v.number(),
        text: v.optional(v.string()),
        checked: v.optional(v.boolean()),
        url: v.optional(v.string()),
        alt: v.optional(v.string()),
        caption: v.optional(v.string()),
        color: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_data_source", ["dataSourceId"])
    .index("by_workspace", ["workspaceId"]),

  dataSources: defineTable({
    workspaceId: v.string(),
    databaseDocumentId: v.id("documents"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_database_document", ["databaseDocumentId"]),

  databaseProperties: defineTable({
    workspaceId: v.string(),
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    type: v.union(
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
    ),
    order: v.number(),
    relationDataSourceId: v.optional(v.id("dataSources")),
    reciprocalPropertyId: v.optional(v.id("databaseProperties")),
    rollupRelationPropertyId: v.optional(v.id("databaseProperties")),
    rollupTargetPropertyId: v.optional(v.id("databaseProperties")),
    rollupFunction: v.optional(
      v.union(
        v.literal("count"),
        v.literal("count_values"),
        v.literal("sum"),
        v.literal("average"),
        v.literal("min"),
        v.literal("max"),
      ),
    ),
    formulaExpression: v.optional(v.string()),
    formulaVersion: v.optional(v.number()),
    formulaAstJson: v.optional(v.string()),
    formulaDependencyPropertyIds: v.optional(
      v.array(v.id("databaseProperties")),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_data_source", ["dataSourceId"])
    .index("by_workspace", ["workspaceId"]),

  databaseSelectOptions: defineTable({
    workspaceId: v.string(),
    dataSourceId: v.id("dataSources"),
    propertyId: v.id("databaseProperties"),
    name: v.string(),
    color: v.string(),
    order: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_data_source", ["dataSourceId"]),

  databasePropertyValues: defineTable({
    workspaceId: v.string(),
    dataSourceId: v.id("dataSources"),
    documentId: v.id("documents"),
    propertyId: v.id("databaseProperties"),
    type: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("select"),
      v.literal("multi_select"),
      v.literal("status"),
      v.literal("date"),
      v.literal("checkbox"),
      v.literal("url"),
    ),
    textValue: v.optional(v.string()),
    numberValue: v.optional(v.number()),
    booleanValue: v.optional(v.boolean()),
    dateStart: v.optional(v.number()),
    dateEnd: v.optional(v.number()),
    optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
    sortKey: v.string(),
    updatedAt: v.number(),
  })
    .index("by_data_source", ["dataSourceId"])
    .index("by_document", ["documentId"])
    .index("by_document_and_property", ["documentId", "propertyId"])
    .index("by_property_and_sort_key", ["propertyId", "sortKey"]),

  databaseRelations: defineTable({
    workspaceId: v.string(),
    dataSourceId: v.id("dataSources"),
    sourceDocumentId: v.id("documents"),
    propertyId: v.id("databaseProperties"),
    targetDocumentId: v.id("documents"),
    createdAt: v.number(),
  })
    .index("by_source_document_and_property", [
      "sourceDocumentId",
      "propertyId",
    ])
    .index("by_target_document", ["targetDocumentId"])
    .index("by_data_source", ["dataSourceId"]),

  databaseViews: defineTable({
    workspaceId: v.string(),
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    type: v.union(
      v.literal("table"),
      v.literal("board"),
      v.literal("calendar"),
      v.literal("timeline"),
    ),
    order: v.number(),
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
    hiddenOptionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
    colorColumns: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_data_source", ["dataSourceId"])
    .index("by_workspace", ["workspaceId"]),

  userSettings: defineTable({
    userId: v.string(),
    editorFont: v.optional(v.string()),
    focusMode: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  mcpServers: defineTable({
    ownerId: v.string(),
    name: v.string(),
    url: v.string(),
    transport: v.union(v.literal("streamable-http"), v.literal("sse")),
    authType: v.union(
      v.literal("none"),
      v.literal("bearer"),
      v.literal("custom-header"),
    ),
    headerName: v.optional(v.string()),
    secret: v.optional(v.string()),
    isEnabled: v.boolean(),
    lastTestedAt: v.optional(v.number()),
    lastTestStatus: v.optional(
      v.union(v.literal("success"), v.literal("error")),
    ),
    lastTestMessage: v.optional(v.string()),
    toolCount: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
  }).index("by_owner", ["ownerId"]),

  mcpTools: defineTable({
    ownerId: v.string(),
    serverId: v.id("mcpServers"),
    name: v.string(),
    description: v.optional(v.string()),
    inputSchemaJson: v.string(),
    isEnabled: v.boolean(),
    readOnlyHint: v.optional(v.boolean()),
    destructiveHint: v.optional(v.boolean()),
    openWorldHint: v.optional(v.boolean()),
  })
    .index("by_server", ["serverId"])
    .index("by_server_and_name", ["serverId", "name"])
    .index("by_owner", ["ownerId"]),

  mcpExecutions: defineTable({
    ownerId: v.string(),
    serverId: v.id("mcpServers"),
    serverName: v.string(),
    toolName: v.string(),
    argumentsJson: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("error"),
    ),
    resultText: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_server", ["serverId"]),

  mcpEnvironments: defineTable({
    ownerId: v.string(),
    billingOwnerId: v.optional(v.string()),
    workspaceId: v.string(),
    name: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    isEnabled: v.boolean(),
    lastConnectedAt: v.optional(v.number()),
    lastClientName: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_token_hash", ["tokenHash"]),

  contentApiKeys: defineTable({
    workspaceId: v.string(),
    createdById: v.string(),
    billingOwnerId: v.optional(v.string()),
    name: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    dataSourceIds: v.array(v.id("dataSources")),
    isEnabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_token_hash", ["tokenHash"]),

  entitlementGrants: defineTable({
    ownerUserId: v.string(),
    email: v.string(),
    source: v.literal("admin_grant"),
    status: v.union(v.literal("active"), v.literal("revoked")),
    seatLimit: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_user_id", ["ownerUserId"])
    .index("by_email", ["email"]),

  billingSubscriptions: defineTable({
    subscriptionId: v.string(),
    productId: v.string(),
    customerId: v.string(),
    ownerUserId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    planKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("cancelled"),
      v.literal("failed"),
      v.literal("expired"),
    ),
    quantity: v.number(),
    currency: v.string(),
    recurringPreTaxAmount: v.number(),
    trialPeriodDays: v.number(),
    nextBillingAt: v.number(),
    cancelAtNextBillingDate: v.boolean(),
    failureStartedAt: v.optional(v.number()),
    graceEndsAt: v.optional(v.number()),
    accessThrough: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_subscription_id", ["subscriptionId"])
    .index("by_owner_user_id", ["ownerUserId"])
    .index("by_organization_id", ["organizationId"]),
});
