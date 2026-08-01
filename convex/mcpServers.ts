import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

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
});

const requireUserId = async (ctx: {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
}) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
};

const normalizeEndpoint = (value: string) => {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error("Enter a valid MCP server URL");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new Error("MCP server URLs must use HTTP or HTTPS");
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
    throw new Error("Local network MCP URLs are not supported");
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
    const ownerId = await requireUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("MCP server name is required");
    if (args.authType !== "none" && !args.secret?.trim()) {
      throw new Error("This authentication method requires a secret");
    }
    if (args.authType === "custom-header" && !args.headerName?.trim()) {
      throw new Error("A custom header name is required");
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
    const ownerId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error("MCP server not found");
    }
    const name = args.name.trim();
    if (!name) throw new Error("MCP server name is required");
    if (args.authType === "custom-header" && !args.headerName?.trim()) {
      throw new Error("A custom header name is required");
    }
    if (args.authType !== "none" && !args.secret?.trim() && !existing.secret) {
      throw new Error("This authentication method requires a secret");
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
    });
    return null;
  },
});

export const setEnabled = mutation({
  args: { id: v.id("mcpServers"), isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error("MCP server not found");
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
      throw new Error("MCP server not found");
    }
    await ctx.db.delete(args.id);
    return null;
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
      headerName: server.headerName,
      secret: server.secret,
    };
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
      throw new Error("MCP server not found");
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
