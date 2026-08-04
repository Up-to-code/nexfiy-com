"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { cn } from "@/lib/utils";
import {
  ArrowUpCircle,
  Check,
  ChevronsLeftRight,
  LogOut,
  Plus,
  Settings,
  UserPlus,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useSettings } from "@/hooks/useSettingsModal";
import { useRouter } from "next/navigation";
import { useOrganizationContext } from "@/features/organizations/OrganizationProvider";
import { WorkspaceAvatar } from "@/features/organizations/WorkspaceAvatar";
import { useBilling } from "@/features/billing/use-billing";
import posthog from "posthog-js";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const UserItem = ({ navDrawer }: { navDrawer?: boolean }) => {
  const { data: session } = authClient.useSession();
  const settings = useSettings();
  const router = useRouter();
  const { t } = useI18n();
  const { organizations, activeOrganization, setActiveOrganization } =
    useOrganizationContext();
  const workspaceName =
    activeOrganization?.name ?? session?.user.name ?? "My workspace";

  const { setInnerPopoverOpen } = useNavDrawer();
  const billing = useBilling();

  const onOpenChange = (open: boolean) => {
    if (!navDrawer) return;
    setInnerPopoverOpen(open);
  };

  const handleOpenSettings = (
    tab:
      | "account"
      | "organization"
      | "people"
      | "billing"
      | "preferences"
      | "api"
      | "mcp",
    action?: "create-workspace",
  ) => {
    setInnerPopoverOpen(false);
    settings.onOpen(tab, action);
  };

  return (
    <DropdownMenu onOpenChange={navDrawer ? onOpenChange : undefined}>
      <DropdownMenuTrigger
        className={cn(
          "focus:outline-none focus-visible:outline-none",
          navDrawer ? "w-full" : "",
        )}
      >
        <div
          role="button"
          className={cn(
            "hover:bg-primary/5 flex w-full items-center p-3 text-sm transition-colors",
            navDrawer ? "justify-between rounded-full" : "rounded-none",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-x-2",
              navDrawer ? "w-full" : "max-w-39",
            )}
          >
            <WorkspaceAvatar
              name={workspaceName}
              image={activeOrganization?.logo ?? session?.user.image}
              className="size-5 rounded-[6px] [&_[data-slot=avatar-fallback]]:rounded-[5px] [&_[data-slot=avatar-fallback]]:text-[10px]"
            />
            <span className="text-foreground line-clamp-1 text-start font-semibold">
              {workspaceName}
            </span>
          </div>
          <ChevronsLeftRight className="text-muted-foreground ml-2 h-4 w-4 shrink-0 rotate-90" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="bg-popover text-popover-foreground border-border w-72 rounded-xl border p-1.5 shadow-xl"
        align="start"
        alignOffset={11}
        forceMount
      >
        {/* Active Workspace Header Info */}
        <div className="flex items-center gap-x-3 p-2">
          <WorkspaceAvatar
            name={workspaceName}
            image={activeOrganization?.logo ?? session?.user.image}
            className="border-border/50 size-9 rounded-lg border [&_[data-slot=avatar-fallback]]:rounded-md [&_[data-slot=avatar-fallback]]:text-xs"
          />
          <div className="flex min-w-0 flex-col">
            <p className="text-foreground line-clamp-1 text-sm font-semibold">
              {workspaceName}
            </p>
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {billing.subscription?.hasPro
                ? t("app.proMembership", {
                    count: String(billing.subscription.quantity),
                    unit:
                      billing.subscription.quantity === 1
                        ? t("common.seat")
                        : t("common.seats"),
                  })
                : t("app.freeMembership")}
            </p>
          </div>
        </div>

        {/* Quick Menu Items */}
        <div className="space-y-0.5 py-1">
          {!billing.subscription?.hasPro ? (
            <DropdownMenuItem
              onClick={() => handleOpenSettings("billing")}
              className="cursor-pointer font-medium text-[#2383E2] hover:text-[#2383E2] focus:text-[#2383E2]"
            >
              <ArrowUpCircle className="size-4 text-[#2383E2]" />
              {t("common.upgrade")}
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            onClick={() => handleOpenSettings("account")}
            className="cursor-pointer"
          >
            <Settings className="text-muted-foreground size-4" />
            {t("common.settings")}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleOpenSettings("people")}
            className="cursor-pointer"
          >
            <UserPlus className="text-muted-foreground size-4" />
            {t("common.inviteMembers")}
          </DropdownMenuItem>

        </div>

        <DropdownMenuSeparator className="bg-border/60 my-1" />

        {/* Email Label */}
        <div className="px-2 py-1">
          <p className="text-muted-foreground/80 truncate text-[11px] font-normal">
            {session?.user.email}
          </p>
        </div>

        {/* Workspace Switcher Section */}
        <div className="space-y-0.5 py-0.5">
          {/* Default Personal Space / Workspace */}
          <DropdownMenuItem
            onClick={() => setActiveOrganization(null)}
            className="flex cursor-pointer items-center justify-between"
          >
            <div className="flex min-w-0 items-center gap-x-2">
              <WorkspaceAvatar
                name={session?.user.name ?? "Personal"}
                image={session?.user.image}
                className="size-5 rounded-[5px]"
              />
              <span className="truncate text-sm font-medium">
                {session?.user.name
                  ? t("app.personalSpaceNamed", { name: session.user.name })
                  : t("common.personalSpace")}
              </span>
            </div>
            {!activeOrganization && (
              <Check className="text-foreground ml-2 size-4 shrink-0" />
            )}
          </DropdownMenuItem>

          {/* Organization Workspaces */}
          {organizations.map((org) => {
            const isActive = activeOrganization?.id === org.id;
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActiveOrganization(org.id)}
                className="flex cursor-pointer items-center justify-between"
              >
                <div className="flex min-w-0 items-center gap-x-2">
                  <WorkspaceAvatar
                    name={org.name}
                    image={org.logo}
                    className="size-5 rounded-[5px]"
                  />
                  <span className="truncate text-sm font-medium">
                    {org.name}
                  </span>
                </div>
                {isActive && (
                  <Check className="text-foreground ml-2 size-4 shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}

          {/* Add / New Workspace */}
          <DropdownMenuItem
            onClick={() =>
              handleOpenSettings("organization", "create-workspace")
            }
            className="cursor-pointer font-medium text-[#2383E2] hover:text-[#2383E2] focus:text-[#2383E2]"
          >
            <Plus className="size-4 text-[#2383E2]" />
            {t("common.newWorkspace")}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-border/60 my-1" />

        {/* Log Out */}
        <DropdownMenuItem
          onClick={async () => {
            setInnerPopoverOpen(false);
            await authClient.signOut();
            posthog.reset();
            router.push("/");
            router.refresh();
          }}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <LogOut className="text-muted-foreground size-4" />
          <span>{t("app.logOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
