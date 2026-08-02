"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

export type McpServerInput = {
  name: string;
  url: string;
  transport: "streamable-http" | "sse";
  authType: "none" | "bearer" | "custom-header";
  headerName?: string;
  secret?: string;
};

function userFacingError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }
  return fallback;
}

export const useMcpServers = (
  enabled: boolean,
  selectedServerId?: Id<"mcpServers">,
) => {
  const servers = useQuery(api.mcpServers.list, enabled ? {} : "skip");
  const tools = useQuery(
    api.mcpServers.listTools,
    enabled && selectedServerId ? { serverId: selectedServerId } : "skip",
  );
  const executions = useQuery(
    api.mcpServers.listExecutions,
    enabled ? {} : "skip",
  );
  const createServer = useMutation(api.mcpServers.create);
  const updateServer = useMutation(api.mcpServers.update);
  const removeServer = useMutation(api.mcpServers.remove);
  const setServerEnabled = useMutation(api.mcpServers.setEnabled);
  const setToolEnabledMutation = useMutation(api.mcpServers.setToolEnabled);
  const testServerConnection = useAction(api.mcpActions.testConnection);
  const invokeToolAction = useAction(api.mcpActions.invokeTool);

  const create = async (input: McpServerInput) => {
    try {
      const id = await createServer(input);
      toast.success("MCP connection saved");
      return id;
    } catch (error) {
      logger.error("Failed to create MCP server", error);
      toast.error(userFacingError(error, "Could not add MCP server"));
      return null;
    }
  };

  const update = async (id: Id<"mcpServers">, input: McpServerInput) => {
    try {
      await updateServer({ id, ...input });
      toast.success("MCP connection updated");
      return true;
    } catch (error) {
      logger.error("Failed to update MCP server", error);
      toast.error(userFacingError(error, "Could not update MCP server"));
      return false;
    }
  };

  const remove = async (id: Id<"mcpServers">) => {
    try {
      await removeServer({ id });
      toast.success("MCP connection removed");
      return true;
    } catch (error) {
      logger.error("Failed to remove MCP server", error);
      toast.error("Could not remove MCP server");
      return false;
    }
  };

  const setEnabled = async (id: Id<"mcpServers">, isEnabled: boolean) => {
    try {
      await setServerEnabled({ id, isEnabled });
    } catch (error) {
      logger.error("Failed to change MCP server status", error);
      toast.error("Could not change MCP server status");
    }
  };

  const setToolEnabled = async (id: Id<"mcpTools">, isEnabled: boolean) => {
    try {
      await setToolEnabledMutation({ id, isEnabled });
    } catch (error) {
      logger.error("Failed to change MCP tool status", error);
      toast.error("Could not change tool access");
    }
  };

  const syncTools = async (id: Id<"mcpServers">) => {
    try {
      const result = await testServerConnection({ id });
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
      return result.success;
    } catch (error) {
      logger.error("Failed to sync MCP tools", error);
      toast.error(userFacingError(error, "Connection test failed"));
      return false;
    }
  };

  const invokeTool = async (input: {
    serverId: Id<"mcpServers">;
    toolName: string;
    argumentsJson: string;
    confirmed: boolean;
  }) => {
    try {
      const result = await invokeToolAction(input);
      result.success
        ? toast.success("Tool completed")
        : toast.error("Tool returned an error");
      return result;
    } catch (error) {
      logger.error("Failed to invoke MCP tool", error);
      toast.error(userFacingError(error, "Tool call failed"));
      return null;
    }
  };

  return {
    servers,
    tools,
    executions,
    isLoading: servers === undefined,
    isToolsLoading: Boolean(selectedServerId) && tools === undefined,
    create,
    update,
    remove,
    setEnabled,
    setToolEnabled,
    syncTools,
    invokeTool,
  };
};
