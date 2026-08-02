import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireProForUser } from "./lib/billingDomain";

const transportValidator = v.union(
  v.literal("streamable-http"),
  v.literal("sse"),
);
const authTypeValidator = v.union(
  v.literal("none"),
  v.literal("bearer"),
  v.literal("custom-header"),
);
const testStatusValidator = v.union(v.literal("success"), v.literal("error"));
const executionStatusValidator = v.union(
  v.literal("running"),
  v.literal("success"),
  v.literal("error"),
);

const mcpError = (code: string, message: string) =>
  new ConvexError({ code, message });

const serverMetadataValidator = v.object({
  _id: v.id("mcpServers"),
  _creationTime: v.number(),
  name: v.string(),
  url: v.string(),
  transport: transportValidator,
  authType: authTypeValidator,
  headerName: v.optional(v.string()),
  hasSecret: v.boolean(),
  isEnabled: v.boolean(),
  lastTestedAt: v.optional(v.number()),
  lastTestStatus: v.optional(testStatusValidator),
  lastTestMessage: v.optional(v.string()),
  toolCount: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
});

const toolMetadataValidator = v.object({
  _id: v.id("mcpTools"),
  _creationTime: v.number(),
  serverId: v.id("mcpServers"),
  name: v.string(),
  description: v.optional(v.string()),
  inputSchemaJson: v.string(),
  isEnabled: v.boolean(),
  readOnlyHint: v.optional(v.boolean()),
  destructiveHint: v.optional(v.boolean()),
  openWorldHint: v.optional(v.boolean()),
  requiresConfirmation: v.boolean(),
});

const executionMetadataValidator = v.object({
  _id: v.id("mcpExecutions"),
  _creationTime: v.number(),
  serverId: v.id("mcpServers"),
  serverName: v.string(),
  toolName: v.string(),
  argumentsJson: v.string(),
  status: executionStatusValidator,
  resultText: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
});

const requireUserId = async (ctx: {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
}) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw mcpError("UNAUTHENTICATED", "Sign in to manage MCP connections");
  }
  return identity.subject;
};

const requireProUserId = async (ctx: Parameters<typeof requireUserId>[0]) => {
  const ownerId = await requireUserId(ctx);
  await requireProForUser(
    ctx as Parameters<typeof requireProForUser>[0],
    ownerId,
  );
  return ownerId;
};

const normalizeEndpoint = (value: string) => {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw mcpError("INVALID_URL", "Enter a valid MCP server URL");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw mcpError("INVALID_URL", "MCP server URLs must use HTTP or HTTPS");
  }
  const host = endpoint.hostname.toLowerCase();
  const ipv4Parts = host.split(".").map(Number);
  const isPrivateIpv4 =
    ipv4Parts.length === 4 &&
    ipv4Parts.every(
      (part) => Number.isInteger(part) && part >= 0 && part <= 255,
    ) &&
    (ipv4Parts[0] === 10 ||
      ipv4Parts[0] === 127 ||
      (ipv4Parts[0] === 169 && ipv4Parts[1] === 254) ||
      (ipv4Parts[0] === 172 && ipv4Parts[1] >= 16 && ipv4Parts[1] <= 31) ||
      (ipv4Parts[0] === 192 && ipv4Parts[1] === 168));
  const isPrivateIpv6 =
    host.includes(":") &&
    (host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80:"));
  if (
    ["localhost", "0.0.0.0", "::1", "metadata.google.internal"].includes(
      host,
    ) ||
    host.endsWith(".local") ||
    isPrivateIpv6 ||
    isPrivateIpv4
  ) {
    throw mcpError("UNSAFE_URL", "Local network MCP URLs are not supported");
  }
  return endpoint.toString();
};

export const list = query({
  args: {},
  returns: v.array(serverMetadataValidator),
  handler: async (ctx) => {
    const ownerId = await requireUserId(ctx);
    const servers = await ctx.db
      .query("mcpServers")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(100);
    return servers.map(({ ownerId: _ownerId, secret, ...server }) => ({
      ...server,
      hasSecret: Boolean(secret),
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    transport: transportValidator,
    authType: authTypeValidator,
    headerName: v.optional(v.string()),
    secret: v.optional(v.string()),
  },
  returns: v.id("mcpServers"),
  handler: async (ctx, args) => {
    const ownerId = await requireProUserId(ctx);
    const name = args.name.trim();
    if (!name) {
      throw mcpError("INVALID_NAME", "MCP server name is required");
    }
    if (args.authType !== "none" && !args.secret?.trim()) {
      throw mcpError(
        "INVALID_AUTH",
        "This authentication method requires a secret",
      );
    }
    if (args.authType === "custom-header" && !args.headerName?.trim()) {
      throw mcpError("INVALID_AUTH", "A custom header name is required");
    }
    return await ctx.db.insert("mcpServers", {
      ownerId,
      name,
      url: normalizeEndpoint(args.url),
      transport: args.transport,
      authType: args.authType,
      headerName:
        args.authType === "custom-header" ? args.headerName?.trim() : undefined,
      secret: args.authType === "none" ? undefined : args.secret?.trim(),
      isEnabled: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("mcpServers"),
    name: v.string(),
    url: v.string(),
    transport: transportValidator,
    authType: authTypeValidator,
    headerName: v.optional(v.string()),
    secret: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireProUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.ownerId !== ownerId) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    const name = args.name.trim();
    if (!name) {
      throw mcpError("INVALID_NAME", "MCP server name is required");
    }
    if (args.authType === "custom-header" && !args.headerName?.trim()) {
      throw mcpError("INVALID_AUTH", "A custom header name is required");
    }
    if (args.authType !== "none" && !args.secret?.trim() && !existing.secret) {
      throw mcpError(
        "INVALID_AUTH",
        "This authentication method requires a secret",
      );
    }
    await ctx.db.patch(args.id, {
      name,
      url: normalizeEndpoint(args.url),
      transport: args.transport,
      authType: args.authType,
      headerName:
        args.authType === "custom-header" ? args.headerName?.trim() : undefined,
      secret:
        args.authType === "none"
          ? undefined
          : args.secret?.trim() || existing.secret,
      lastTestStatus: undefined,
      lastTestMessage: undefined,
      toolCount: undefined,
      lastSyncedAt: undefined,
    });
    return null;
  },
});

export const setEnabled = mutation({
  args: { id: v.id("mcpServers"), isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = args.isEnabled
      ? await requireProUserId(ctx)
      : await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.ownerId !== ownerId) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("mcpServers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.ownerId !== ownerId) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    const [tools, executions] = await Promise.all([
      ctx.db
        .query("mcpTools")
        .withIndex("by_server", (q) => q.eq("serverId", args.id))
        .take(500),
      ctx.db
        .query("mcpExecutions")
        .withIndex("by_server", (q) => q.eq("serverId", args.id))
        .take(500),
    ]);
    await Promise.all([
      ...tools.map((tool) => ctx.db.delete(tool._id)),
      ...executions.map((execution) => ctx.db.delete(execution._id)),
      ctx.db.delete(args.id),
    ]);
    return null;
  },
});

export const listTools = query({
  args: { serverId: v.id("mcpServers") },
  returns: v.array(toolMetadataValidator),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const server = await ctx.db.get(args.serverId);
    if (!server || server.ownerId !== ownerId) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    const tools = await ctx.db
      .query("mcpTools")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .take(200);
    return tools.map(({ ownerId: _ownerId, ...tool }) => ({
      ...tool,
      requiresConfirmation:
        tool.readOnlyHint !== true || tool.destructiveHint === true,
    }));
  },
});

export const listExecutions = query({
  args: {},
  returns: v.array(executionMetadataValidator),
  handler: async (ctx) => {
    const ownerId = await requireUserId(ctx);
    const executions = await ctx.db
      .query("mcpExecutions")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(30);
    return executions.map(({ ownerId: _ownerId, ...execution }) => execution);
  },
});

export const getOwnedConnection = internalQuery({
  args: { id: v.id("mcpServers"), ownerId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      url: v.string(),
      transport: transportValidator,
      authType: authTypeValidator,
      name: v.string(),
      isEnabled: v.boolean(),
      headerName: v.optional(v.string()),
      secret: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.id);
    if (!server || server.ownerId !== args.ownerId) return null;
    return {
      url: server.url,
      transport: server.transport,
      authType: server.authType,
      name: server.name,
      isEnabled: server.isEnabled,
      headerName: server.headerName,
      secret: server.secret,
    };
  },
});

export const getOwnedTool = internalQuery({
  args: {
    serverId: v.id("mcpServers"),
    ownerId: v.string(),
    toolName: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      isEnabled: v.boolean(),
      requiresConfirmation: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const tool = await ctx.db
      .query("mcpTools")
      .withIndex("by_server_and_name", (q) =>
        q.eq("serverId", args.serverId).eq("name", args.toolName),
      )
      .unique();
    if (!tool || tool.ownerId !== args.ownerId) return null;
    return {
      isEnabled: tool.isEnabled,
      requiresConfirmation:
        tool.readOnlyHint !== true || tool.destructiveHint === true,
    };
  },
});

export const replaceTools = internalMutation({
  args: {
    serverId: v.id("mcpServers"),
    ownerId: v.string(),
    tools: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        inputSchemaJson: v.string(),
        readOnlyHint: v.optional(v.boolean()),
        destructiveHint: v.optional(v.boolean()),
        openWorldHint: v.optional(v.boolean()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server || server.ownerId !== args.ownerId) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    const existing = await ctx.db
      .query("mcpTools")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .take(500);
    const enabledByName = new Map(
      existing.map((tool) => [tool.name, tool.isEnabled]),
    );
    await Promise.all(existing.map((tool) => ctx.db.delete(tool._id)));
    for (const tool of args.tools.slice(0, 200)) {
      await ctx.db.insert("mcpTools", {
        ownerId: args.ownerId,
        serverId: args.serverId,
        ...tool,
        isEnabled: enabledByName.get(tool.name) ?? true,
      });
    }
    await ctx.db.patch(args.serverId, {
      toolCount: Math.min(args.tools.length, 200),
      lastSyncedAt: Date.now(),
    });
    return null;
  },
});

export const setToolEnabled = mutation({
  args: { id: v.id("mcpTools"), isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = args.isEnabled
      ? await requireProUserId(ctx)
      : await requireUserId(ctx);
    const tool = await ctx.db.get(args.id);
    if (!tool || tool.ownerId !== ownerId) {
      throw mcpError("MCP_TOOL_NOT_FOUND", "MCP tool not found");
    }
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled });
    return null;
  },
});

export const startExecution = internalMutation({
  args: {
    ownerId: v.string(),
    serverId: v.id("mcpServers"),
    serverName: v.string(),
    toolName: v.string(),
    argumentsJson: v.string(),
  },
  returns: v.id("mcpExecutions"),
  handler: async (ctx, args) =>
    await ctx.db.insert("mcpExecutions", {
      ...args,
      status: "running",
      startedAt: Date.now(),
    }),
});

export const finishExecution = internalMutation({
  args: {
    id: v.id("mcpExecutions"),
    ownerId: v.string(),
    status: v.union(v.literal("success"), v.literal("error")),
    resultText: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.id);
    if (!execution || execution.ownerId !== args.ownerId) {
      throw mcpError("MCP_EXECUTION_NOT_FOUND", "MCP execution not found");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      resultText: args.resultText,
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const saveTestResult = internalMutation({
  args: {
    id: v.id("mcpServers"),
    ownerId: v.string(),
    status: testStatusValidator,
    message: v.string(),
    toolCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.ownerId !== args.ownerId) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    await ctx.db.patch(args.id, {
      lastTestedAt: Date.now(),
      lastTestStatus: args.status,
      lastTestMessage: args.message.slice(0, 300),
      toolCount: args.toolCount,
    });
    return null;
  },
});
