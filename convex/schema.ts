import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"]),

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
  }).index("by_owner", ["ownerId"]),
});
