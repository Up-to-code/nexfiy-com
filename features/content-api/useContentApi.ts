"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { generateAccessToken, hashAccessToken } from "@/lib/access-token";
import { logger } from "@/lib/logger";

export type ContentSource = {
  id: Id<"dataSources">;
  documentId: Id<"documents">;
  name: string;
  icon: string | null;
  updatedAt: number;
};

export type CreatedContentApiKey = {
  id: Id<"contentApiKeys">;
  name: string;
  token: string;
};

export function useContentApi(enabled: boolean) {
  const settings = useQuery(api.contentApi.getSettings, enabled ? {} : "skip");
  const createKey = useMutation(api.contentApi.createKey);
  const updateKeySources = useMutation(api.contentApi.updateKeySources);
  const setKeyEnabled = useMutation(api.contentApi.setKeyEnabled);
  const revokeKey = useMutation(api.contentApi.revokeKey);

  const create = async (
    name: string,
    dataSourceIds: Id<"dataSources">[],
  ): Promise<CreatedContentApiKey | null> => {
    try {
      const token = generateAccessToken("nxf_content_");
      const tokenHash = await hashAccessToken(token);
      const id = await createKey({
        name,
        tokenHash,
        tokenPrefix: token.slice(0, 20),
        dataSourceIds,
      });
      toast.success("Content API key created");
      return { id, name: name.trim(), token };
    } catch (error) {
      logger.error("Failed to create Content API key", error);
      toast.error("Could not create the Content API key");
      return null;
    }
  };

  const updateSources = async (
    id: Id<"contentApiKeys">,
    dataSourceIds: Id<"dataSources">[],
  ) => {
    try {
      await updateKeySources({ id, dataSourceIds });
      toast.success("Database access updated");
      return true;
    } catch (error) {
      logger.error("Failed to update Content API database access", error);
      toast.error("Could not update database access");
      return false;
    }
  };

  const setEnabled = async (id: Id<"contentApiKeys">, isEnabled: boolean) => {
    try {
      await setKeyEnabled({ id, isEnabled });
    } catch (error) {
      logger.error("Failed to change Content API key status", error);
      toast.error("Could not change API access");
    }
  };

  const revoke = async (id: Id<"contentApiKeys">) => {
    try {
      await revokeKey({ id });
      toast.success("Content API key revoked");
    } catch (error) {
      logger.error("Failed to revoke Content API key", error);
      toast.error("Could not revoke the API key");
    }
  };

  return {
    keys: settings?.keys,
    sources: settings?.sources,
    canManage: settings?.canManage ?? true,
    isLoading: settings === undefined,
    create,
    updateSources,
    setEnabled,
    revoke,
  };
}
