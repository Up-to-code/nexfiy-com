"use node";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

const CONNECTION_TIMEOUT_MS = 12_000;
const TOOL_TIMEOUT_MS = 45_000;
const MAX_ARGUMENTS_LENGTH = 40_000;
const MAX_RESULT_LENGTH = 40_000;

const mcpError = (code: string, message: string) =>
  new ConvexError({ code, message });

type Connection = {
  url: string;
  transport: "streamable-http" | "sse";
  authType: "none" | "bearer" | "custom-header";
  name: string;
  isEnabled: boolean;
  headerName?: string;
  secret?: string;
};

function createMcpClient(connection: Connection) {
  const headers = new Headers();
  if (connection.authType === "bearer" && connection.secret) {
    headers.set("Authorization", `Bearer ${connection.secret}`);
  } else if (
    connection.authType === "custom-header" &&
    connection.headerName &&
    connection.secret
  ) {
    headers.set(connection.headerName, connection.secret);
  }

  const endpoint = new URL(connection.url);
  const requestInit = { headers };
  const transport =
    connection.transport === "sse"
      ? new SSEClientTransport(endpoint, { requestInit })
      : new StreamableHTTPClientTransport(endpoint, { requestInit });
  const client = new Client({ name: "nexfiy", version: "1.0.0" });
  return { client, transport };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(`Request timed out after ${timeoutMs / 1000} seconds`),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function parseArguments(argumentsJson: string) {
  if (argumentsJson.length > MAX_ARGUMENTS_LENGTH) {
    throw mcpError("ARGUMENTS_TOO_LARGE", "Tool arguments are too large");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(argumentsJson || "{}");
  } catch {
    throw mcpError("INVALID_ARGUMENTS", "Tool arguments must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw mcpError("INVALID_ARGUMENTS", "Tool arguments must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function formatToolResult(result: unknown) {
  if (!result || typeof result !== "object") return String(result ?? "");
  const record = result as Record<string, unknown>;
  const content = Array.isArray(record.content)
    ? (record.content as Array<Record<string, unknown>>)
    : [];
  const parts = content.map((item) => {
    if (item.type === "text") return String(item.text ?? "");
    if (item.type === "image" || item.type === "audio") {
      const dataLength = typeof item.data === "string" ? item.data.length : 0;
      return `[${item.type}: ${String(item.mimeType ?? "unknown")}, ${dataLength} encoded characters]`;
    }
    if (item.type === "resource_link") {
      return `[resource: ${String(item.name ?? "resource")} — ${String(item.uri ?? "")}]`;
    }
    if (item.type === "resource") {
      const resource = item.resource as Record<string, unknown> | undefined;
      if (typeof resource?.text === "string") return resource.text;
      return `[resource: ${String(resource?.uri ?? "embedded data")}]`;
    }
    return JSON.stringify(item);
  });
  if (record.structuredContent) {
    parts.push(JSON.stringify(record.structuredContent, null, 2));
  } else if (record.toolResult) {
    parts.push(JSON.stringify(record.toolResult, null, 2));
  }
  const text =
    parts.filter(Boolean).join("\n\n") || "Tool completed without text output.";
  return text.slice(0, MAX_RESULT_LENGTH);
}

export const testConnection = action({
  args: { id: v.id("mcpServers") },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    toolCount: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    toolCount?: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw mcpError("UNAUTHENTICATED", "Sign in to use MCP tools");
    }
    const proAccess = await ctx.runQuery(
      internal.billing.getProAccessForOwner,
      { ownerUserId: identity.subject },
    );
    if (!proAccess.hasPro) {
      throw mcpError("PAYMENT_REQUIRED", "Nexfiy Pro is required for MCP");
    }
    const connection = await ctx.runQuery(
      internal.mcpServers.getOwnedConnection,
      { id: args.id, ownerId: identity.subject },
    );
    if (!connection) {
      throw mcpError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }

    const { client, transport } = createMcpClient(connection);
    try {
      const result = await withTimeout(
        (async () => {
          await client.connect(transport);
          return await client.listTools();
        })(),
        CONNECTION_TIMEOUT_MS,
      );
      const tools = result.tools.slice(0, 200).map((tool) => ({
        name: tool.name.slice(0, 200),
        description: tool.description?.slice(0, 1_000),
        inputSchemaJson: JSON.stringify(tool.inputSchema, null, 2).slice(
          0,
          20_000,
        ),
        readOnlyHint: tool.annotations?.readOnlyHint,
        destructiveHint: tool.annotations?.destructiveHint,
        openWorldHint: tool.annotations?.openWorldHint,
      }));
      await ctx.runMutation(internal.mcpServers.replaceTools, {
        serverId: args.id,
        ownerId: identity.subject,
        tools,
      });
      const message = `Connected and synced ${tools.length} tool${tools.length === 1 ? "" : "s"}.`;
      await ctx.runMutation(internal.mcpServers.saveTestResult, {
        id: args.id,
        ownerId: identity.subject,
        status: "success",
        message,
        toolCount: tools.length,
      });
      return { success: true, message, toolCount: tools.length };
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

export const invokeTool = action({
  args: {
    serverId: v.id("mcpServers"),
    toolName: v.string(),
    argumentsJson: v.string(),
    confirmed: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    resultText: v.string(),
    executionId: v.id("mcpExecutions"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    resultText: string;
    executionId: Id<"mcpExecutions">;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw mcpError("UNAUTHENTICATED", "Sign in to use MCP tools");
    }
    const proAccess = await ctx.runQuery(
      internal.billing.getProAccessForOwner,
      { ownerUserId: identity.subject },
    );
    if (!proAccess.hasPro) {
      throw mcpError("PAYMENT_REQUIRED", "Nexfiy Pro is required for MCP");
    }
    const [connection, tool] = await Promise.all([
      ctx.runQuery(internal.mcpServers.getOwnedConnection, {
        id: args.serverId,
        ownerId: identity.subject,
      }),
      ctx.runQuery(internal.mcpServers.getOwnedTool, {
        serverId: args.serverId,
        ownerId: identity.subject,
        toolName: args.toolName,
      }),
    ]);
    if (!connection || !connection.isEnabled) {
      throw mcpError(
        "MCP_CONNECTION_DISABLED",
        "MCP connection is disabled or unavailable",
      );
    }
    if (!tool || !tool.isEnabled) {
      throw mcpError(
        "MCP_TOOL_DISABLED",
        "MCP tool is disabled or unavailable",
      );
    }
    if (tool.requiresConfirmation && !args.confirmed) {
      throw mcpError(
        "CONFIRMATION_REQUIRED",
        "Confirm this tool call before running it",
      );
    }
    const parsedArguments = parseArguments(args.argumentsJson);
    const normalizedArguments = JSON.stringify(parsedArguments);
    const executionId = await ctx.runMutation(
      internal.mcpServers.startExecution,
      {
        ownerId: identity.subject,
        serverId: args.serverId,
        serverName: connection.name,
        toolName: args.toolName,
        argumentsJson: normalizedArguments.slice(0, MAX_ARGUMENTS_LENGTH),
      },
    );

    const { client, transport } = createMcpClient(connection);
    try {
      const result = await withTimeout(
        (async () => {
          await client.connect(transport);
          return await client.callTool({
            name: args.toolName,
            arguments: parsedArguments,
          });
        })(),
        TOOL_TIMEOUT_MS,
      );
      const resultText = formatToolResult(result);
      const success =
        !result || typeof result !== "object" || !("isError" in result)
          ? true
          : result.isError !== true;
      await ctx.runMutation(internal.mcpServers.finishExecution, {
        id: executionId,
        ownerId: identity.subject,
        status: success ? "success" : "error",
        resultText,
        errorMessage: success ? undefined : resultText.slice(0, 1_000),
      });
      return { success, resultText, executionId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tool call failed";
      await ctx.runMutation(internal.mcpServers.finishExecution, {
        id: executionId,
        ownerId: identity.subject,
        status: "error",
        errorMessage: message.slice(0, 1_000),
      });
      return { success: false, resultText: message, executionId };
    } finally {
      await client.close().catch(() => undefined);
    }
  },
});
