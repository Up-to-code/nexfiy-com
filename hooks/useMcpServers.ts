"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

export type McpServerInput = {
  name: string;
  url: string;
  transport: "streamable-http" | "sse";
  authType: "none" | "bearer" | "custom-header";
  headerName?: string;
  secret?: string;
};

export const useMcpServers = (enabled: boolean) => {
  const servers = useQuery(api.mcpServers.list, enabled ? {} : "skip");
  const createServer = useMutation(api.mcpServers.create);
  const updateServer = useMutation(api.mcpServers.update);
  const removeServer = useMutation(api.mcpServers.remove);
  const setServerEnabled = useMutation(api.mcpServers.setEnabled);
  const testServerConnection = useAction(api.mcpActions.testConnection);

  const create = async (input: McpServerInput) => {
    try {
      await createServer(input);
      toast.success("MCP server added");
      return true;
    } catch (error) {
      logger.error("Failed to create MCP server", error);
      toast.error(
        error instanceof Error ? error.message : "Could not add MCP server",
      );
      return false;
    }
  };

  const update = async (id: Id<"mcpServers">, input: McpServerInput) => {
    try {
      await updateServer({ id, ...input });
      toast.success("MCP server updated");
      return true;
    } catch (error) {
      logger.error("Failed to update MCP server", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update MCP server",
      );
      return false;
    }
  };

  const remove = async (id: Id<"mcpServers">) => {
    try {
      await removeServer({ id });
      toast.success("MCP server removed");
    } catch (error) {
      logger.error("Failed to remove MCP server", error);
      toast.error("Could not remove MCP server");
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

  const test = async (id: Id<"mcpServers">) => {
    try {
      const result = await testServerConnection({ id });
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
    } catch (error) {
      logger.error("Failed to test MCP server", error);
      toast.error(
        error instanceof Error ? error.message : "Connection test failed",
      );
    }
  };

  return {
    servers,
    isLoading: servers === undefined,
    create,
    update,
    remove,
    setEnabled,
    test,
  };
};
