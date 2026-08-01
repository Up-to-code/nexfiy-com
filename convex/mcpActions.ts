"use node";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const testConnection = action({
  args: { id: v.id("mcpServers") },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    toolCount: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const server = await ctx.runQuery(internal.mcpServers.getOwnedConnection, {
      id: args.id,
      ownerId: identity.subject,
    });
    if (!server) throw new Error("MCP server not found");

    const headers = new Headers();
    if (server.authType === "bearer" && server.secret) {
      headers.set("Authorization", `Bearer ${server.secret}`);
    } else if (
      server.authType === "custom-header" &&
      server.headerName &&
      server.secret
    ) {
      headers.set(server.headerName, server.secret);
    }
    const endpoint = new URL(server.url);
    const requestInit = { headers };
    const transport =
      server.transport === "sse"
        ? new SSEClientTransport(endpoint, { requestInit })
        : new StreamableHTTPClientTransport(endpoint, { requestInit });
    const client = new Client({ name: "zotion", version: "1.0.0" });

    try {
      const tools = await Promise.race([
        (async () => {
          await client.connect(transport);
          return await client.listTools();
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Connection timed out after 12 seconds")),
            12_000,
          ),
        ),
      ]);
      const message = `Connected. ${tools.tools.length} tool${tools.tools.length === 1 ? "" : "s"} available.`;
      await ctx.runMutation(internal.mcpServers.saveTestResult, {
        id: args.id,
        ownerId: identity.subject,
        status: "success",
        message,
        toolCount: tools.tools.length,
      });
      return { success: true, message, toolCount: tools.tools.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection failed";
      await ctx.runMutation(internal.mcpServers.saveTestResult, {
        id: args.id,
        ownerId: identity.subject,
        status: "error",
        message,
      });
      return { success: false, message };
    } finally {
      await client.close().catch(() => undefined);
    }
  },
});
