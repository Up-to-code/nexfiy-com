"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { generateAccessToken, hashAccessToken } from "@/lib/access-token";
import { logger } from "@/lib/logger";

export type WebhookPermission =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "add_blocks";

export type WebhookKeyView = {
  _id: Id<"webhookKeys">;
  name: string;
  tokenPrefix: string;
  permissions: WebhookPermission[];
  isEnabled: boolean;
  createdAt: number;
};

export type CreatedWebhookKey = {
  id: Id<"webhookKeys">;
  name: string;
  token: string;
};

export function useWebhooks(enabled: boolean) {
  const settings = useQuery(api.webhooks.getSettings, enabled ? {} : "skip");
  const createKey = useMutation(api.webhooks.createKey);
  const setPermissions = useMutation(api.webhooks.setKeyPermissions);
  const setKeyEnabled = useMutation(api.webhooks.setKeyEnabled);
  const revokeKey = useMutation(api.webhooks.revokeKey);

  const create = async (
    name: string,
    permissions: WebhookPermission[],
  ): Promise<CreatedWebhookKey | null> => {
    try {
      const token = generateAccessToken("nxf_webhook_");
      const tokenHash = await hashAccessToken(token);
      const id = await createKey({
        name,
        tokenHash,
        tokenPrefix: token.slice(0, 20),
        permissions,
      });
      toast.success("Webhook key created");
      return { id, name: name.trim(), token };
    } catch (error) {
      logger.error("Failed to create webhook key", error);
      toast.error("Could not create the webhook key");
      return null;
    }
  };

  const updatePermissions = async (
    id: Id<"webhookKeys">,
    permissions: WebhookPermission[],
  ) => {
    try {
      await setPermissions({ id, permissions });
      toast.success("Webhook permissions updated");
      return true;
    } catch (error) {
      logger.error("Failed to update webhook permissions", error);
      toast.error("Could not update webhook permissions");
      return false;
    }
  };

  const setEnabled = async (id: Id<"webhookKeys">, isEnabled: boolean) => {
    try {
      await setKeyEnabled({ id, isEnabled });
    } catch (error) {
      logger.error("Failed to change webhook key status", error);
      toast.error("Could not change webhook access");
    }
  };

  const revoke = async (id: Id<"webhookKeys">) => {
    try {
      await revokeKey({ id });
      toast.success("Webhook key revoked");
    } catch (error) {
      logger.error("Failed to revoke webhook key", error);
      toast.error("Could not revoke the webhook key");
    }
  };

  return {
    keys: settings?.keys,
    canManage: settings?.canManage ?? true,
    isLoading: settings === undefined,
    create,
    updatePermissions,
    setEnabled,
    revoke,
  };
}
