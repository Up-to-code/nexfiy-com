"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";
import { generateMcpToken, hashMcpToken } from "@/lib/mcp-token";

export type CreatedMcpEnvironment = {
  id: Id<"mcpEnvironments">;
  name: string;
  url: string;
};

export function useMcpEnvironments(enabled: boolean) {
  const environments = useQuery(
    api.mcpEnvironments.list,
    enabled ? {} : "skip",
  );
  const createEnvironment = useMutation(api.mcpEnvironments.create);
  const setEnvironmentEnabled = useMutation(api.mcpEnvironments.setEnabled);
  const removeEnvironment = useMutation(api.mcpEnvironments.remove);

  const create = async (
    name: string,
  ): Promise<CreatedMcpEnvironment | null> => {
    try {
      const token = generateMcpToken();
      const tokenHash = await hashMcpToken(token);
      const id = await createEnvironment({
        name,
        tokenHash,
        tokenPrefix: token.slice(0, 8),
      });
      const url = `${window.location.origin}/api/mcp/${token}`;
      toast.success("MCP client environment created");
      return { id, name: name.trim(), url };
    } catch (error) {
      logger.error("Failed to create MCP environment", error);
      toast.error("Could not create the MCP client environment");
      return null;
    }
  };

  const setEnabled = async (id: Id<"mcpEnvironments">, isEnabled: boolean) => {
    try {
      await setEnvironmentEnabled({ id, isEnabled });
    } catch (error) {
      logger.error("Failed to change MCP environment status", error);
      toast.error("Could not change client access");
    }
  };

  const remove = async (id: Id<"mcpEnvironments">) => {
    try {
      await removeEnvironment({ id });
      toast.success("MCP client environment revoked");
      return true;
    } catch (error) {
      logger.error("Failed to remove MCP environment", error);
      toast.error("Could not revoke the MCP client environment");
      return false;
    }
  };

  return {
    environments,
    isLoading: environments === undefined,
    create,
    setEnabled,
    remove,
  };
}
