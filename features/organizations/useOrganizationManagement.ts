"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
};

export function useOrganizationManagement(
  organizationId: string | undefined,
  refreshOrganization: () => Promise<void>,
) {
  const [isMutating, setIsMutating] = useState(false);

  const inviteMember = async (email: string, delivery: "email" | "link") => {
    if (!organizationId) return null;

    setIsMutating(true);
    try {
      const { data, error: requestError } =
        await authClient.organization.inviteMember(
          {
            email: email.trim().toLowerCase(),
            role: "member",
            organizationId,
          },
          {
            headers: { "x-nexfiy-invite-delivery": delivery },
          },
        );
      if (requestError || !data) {
        throw new Error(requestError?.message ?? "Invitation was not created");
      }

      await refreshOrganization();
      return data.id;
    } catch (caught) {
      logger.error("Failed to invite organization member", caught);
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Could not create invitation.",
      );
      return null;
    } finally {
      setIsMutating(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    setIsMutating(true);
    try {
      const { error: requestError } =
        await authClient.organization.cancelInvitation({ invitationId });
      if (requestError) {
        throw new Error(requestError.message ?? "Invitation was not canceled");
      }
      await refreshOrganization();
      toast.success("Invitation canceled.");
    } catch (caught) {
      logger.error("Failed to cancel organization invitation", caught);
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Could not cancel invitation.",
      );
    } finally {
      setIsMutating(false);
    }
  };

  const removeMember = async (memberIdOrEmail: string) => {
    if (!organizationId) return false;

    setIsMutating(true);
    try {
      const { error: requestError } =
        await authClient.organization.removeMember({
          memberIdOrEmail,
          organizationId,
        });
      if (requestError) {
        throw new Error(requestError.message ?? "Member was not removed");
      }
      await refreshOrganization();
      toast.success("Member removed.");
      return true;
    } catch (caught) {
      logger.error("Failed to remove organization member", caught);
      toast.error(
        caught instanceof Error ? caught.message : "Could not remove member.",
      );
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    isMutating,
    inviteMember,
    cancelInvitation,
    removeMember,
  };
}
