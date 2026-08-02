"use client";

import { useState } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useOrganizationContext } from "./OrganizationProvider";
import { WorkspaceAvatar } from "./WorkspaceAvatar";
import { useBilling } from "@/features/billing/use-billing";
import { ProUpgradePrompt } from "@/features/billing/ProUpgradePrompt";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OrganizationSettings() {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const {
    organizations,
    activeOrganization,
    isLoading,
    setActiveOrganization,
  } = useOrganizationContext();
  const { data: session } = authClient.useSession();
  const billing = useBilling();

  const createOrganization = async () => {
    const slug = toSlug(name);

    if (!slug) {
      toast.error("Enter a workspace name.");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await authClient.organization.create({
        name: name.trim(),
        slug,
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Workspace was not created");
      }

      await setActiveOrganization(data.id);
      setName("");
      toast.success("Workspace created.");
    } catch (error) {
      logger.error("Failed to create organization", error);
      toast.error("Could not create workspace. Try a different name.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-border/40 border-b pb-5">
        <h2 className="text-lg font-bold">Workspaces</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Switch between your personal workspace and the team organizations you
          belong to.
        </p>
      </div>

      <div className="border-border/40 space-y-3 border-b pb-6">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          My Workspaces
        </h3>

        <div className="divide-border/30 divide-y">
          <button
            type="button"
            onClick={() => setActiveOrganization(null)}
            className={cn(
              "hover:bg-muted/30 flex w-full items-center gap-3.5 rounded-lg px-2 py-3 text-left transition-colors",
              !activeOrganization && "bg-muted/40 font-medium",
            )}
          >
            <WorkspaceAvatar
              name={session?.user.name ?? "Personal workspace"}
              image={session?.user.image}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                Personal workspace
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                Private · Only you
              </span>
            </span>
            {!activeOrganization ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-[#2383E2] text-white">
                <Check className="size-3" strokeWidth={2.5} />
              </span>
            ) : null}
          </button>

          {organizations.map((organization) => {
            const isActive = organization.id === activeOrganization?.id;

            return (
              <button
                type="button"
                key={organization.id}
                onClick={() => setActiveOrganization(organization.id)}
                className={cn(
                  "hover:bg-muted/30 flex w-full items-center gap-3.5 rounded-lg px-2 py-3 text-left transition-colors",
                  isActive && "bg-muted/40 font-medium",
                )}
              >
                <WorkspaceAvatar
                  name={organization.name}
                  image={organization.logo}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {organization.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    Team workspace · {organization.slug}
                  </span>
                </span>
                {isActive ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#2383E2] text-white">
                    <Check className="size-3" strokeWidth={2.5} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-3 text-xs">
            <LoaderCircle className="size-4 animate-spin" /> Loading workspaces…
          </div>
        ) : null}
      </div>

      {!billing.isLoading && !billing.subscription?.hasPro ? (
        <ProUpgradePrompt feature="Team workspaces" />
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Create a team workspace</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Give your team a shared space for pages, databases, and billing.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Input
              id="organization-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workspace name"
              className="border-border/60 h-9 rounded-md bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#2383E2]"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createOrganization();
                }
              }}
            />
            <Button
              type="button"
              onClick={createOrganization}
              disabled={isCreating || !name.trim()}
              className="h-9 shrink-0 rounded-md bg-[#2383E2] px-4 font-medium text-white hover:bg-[#1d6fc2]"
            >
              {isCreating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-4" />
              )}
              {isCreating ? "Creating…" : "Create workspace"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
