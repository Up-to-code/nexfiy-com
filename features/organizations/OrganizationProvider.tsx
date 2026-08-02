"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

type Organization = NonNullable<
  ReturnType<typeof authClient.useListOrganizations>["data"]
>[number];

type OrganizationContextValue = {
  organizations: Organization[];
  activeOrganization: Organization | null;
  isLoading: boolean;
  setActiveOrganization: (organizationId: string | null) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: organizations, isPending: isOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActivePending } =
    authClient.useActiveOrganization();

  const setActiveOrganization = async (organizationId: string | null) => {
    try {
      const { error } = await authClient.organization.setActive({
        organizationId,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.push("/documents");
      router.refresh();
    } catch (error) {
      logger.error("Failed to switch organization", error);
      toast.error("Could not switch workspace.");
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations: organizations ?? [],
        activeOrganization: activeOrganization ?? null,
        isLoading: isOrganizationsPending || isActivePending,
        setActiveOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      "useOrganizationContext must be used inside OrganizationProvider",
    );
  }

  return context;
}
