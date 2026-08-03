"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ProUpgradePrompt } from "@/features/billing/ProUpgradePrompt";
import { useBilling } from "@/features/billing/use-billing";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { WorkspaceInviteDialog } from "./WorkspaceInviteDialog";
import { useOrganizationContext } from "./OrganizationProvider";
import {
  type WorkspaceInvitation,
  useOrganizationManagement,
} from "./useOrganizationManagement";
import { WorkspaceAvatar } from "./WorkspaceAvatar";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function roleLabel(role: string) {
  return role
    .split(",")[0]
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

type WorkspaceMember = {
  id: string;
  userId: string;
  role: string;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

export function OrganizationSettings({
  view,
}: {
  view: "workspace" | "people";
}) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    organizations,
    activeOrganization,
    isLoading,
    setActiveOrganization,
    refreshActiveOrganization,
  } = useOrganizationContext();
  const { data: session } = authClient.useSession();
  const billing = useBilling();
  const management = useOrganizationManagement(
    activeOrganization?.id,
    refreshActiveOrganization,
  );
  const members = (activeOrganization?.members ?? []) as WorkspaceMember[];
  const invitations = (
    (activeOrganization?.invitations ?? []) as WorkspaceInvitation[]
  ).filter((invitation) => invitation.status === "pending");
  const currentMember = members.find(
    (member: WorkspaceMember) => member.userId === session?.user.id,
  );
  const canManageMembers = Boolean(
    currentMember?.role
      .split(",")
      .some(
        (role: string) => role.trim() === "owner" || role.trim() === "admin",
      ),
  );
  const memberCount = activeOrganization ? members.length : 1;

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
      posthog.capture("workspace_created");
      setName("");
      setIsCreateOpen(false);
      toast.success("Workspace created.");
    } catch (error) {
      logger.error("Failed to create organization", error);
      toast.error("Could not create workspace. Try a different name.");
    } finally {
      setIsCreating(false);
    }
  };

  const removeSelectedMember = async () => {
    if (!memberToRemove) return;
    await management.removeMember(memberToRemove.id);
    setMemberToRemove(null);
  };

  const selectedName = activeOrganization?.name ?? "Personal workspace";
  const selectedImage = activeOrganization?.logo ?? session?.user.image;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Current workspace
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="border-border/60 hover:bg-muted/40 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
            >
              <WorkspaceAvatar
                name={selectedName}
                image={selectedImage}
                className="size-9"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {selectedName}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {activeOrganization
                    ? `${memberCount} ${memberCount === 1 ? "member" : "members"}`
                    : "Private · Only you"}
                </span>
              </span>
              {isLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ChevronDown className="text-muted-foreground size-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg p-1.5"
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Switch workspace
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => setActiveOrganization(null)}
              className="gap-3 py-2"
            >
              <WorkspaceAvatar
                name="Personal workspace"
                image={session?.user.image}
                className="size-8 rounded-lg"
              />
              <span className="min-w-0 flex-1 truncate">
                Personal workspace
              </span>
              {!activeOrganization ? (
                <Check className="size-4 text-[#2383e2]" />
              ) : null}
            </DropdownMenuItem>
            {organizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => setActiveOrganization(organization.id)}
                className="gap-3 py-2"
              >
                <WorkspaceAvatar
                  name={organization.name}
                  image={organization.logo}
                  className="size-8 rounded-lg"
                />
                <span className="min-w-0 flex-1 truncate">
                  {organization.name}
                </span>
                {activeOrganization?.id === organization.id ? (
                  <Check className="size-4 text-[#2383e2]" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setIsCreateOpen(true)}>
              <Plus className="size-4" /> Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs
        value={view === "people" ? "members" : "workspace"}
        className="gap-0"
      >
        <div className="border-border/40 border-b">
          <div className="flex items-start justify-between gap-4 pb-5">
            <div>
              <h2 className="text-lg font-bold">
                {view === "people" ? "People" : "Workspaces"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {view === "people"
                  ? `Manage people and invitations for ${selectedName}.`
                  : "Switch workspaces or create a new team workspace."}
              </p>
            </div>
            {view === "people" && activeOrganization && canManageMembers ? (
              <Button
                size="sm"
                className="h-8"
                onClick={() => setIsInviteOpen(true)}
              >
                <Plus className="size-3.5" /> Invite member
              </Button>
            ) : null}
          </div>
        </div>

        <TabsContent value="members" className="mt-0 pt-3">
          <div className="divide-border/40 divide-y">
            {!activeOrganization && session?.user ? (
              <div className="flex items-center gap-3 py-3">
                <Avatar className="size-9">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback>
                    {session.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {session.user.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {session.user.email}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">Owner</span>
              </div>
            ) : null}

            {members.map((member: WorkspaceMember) => {
              const isOwner = member.role.split(",").includes("owner");
              const canRemove =
                canManageMembers &&
                !isOwner &&
                member.userId !== session?.user.id;
              return (
                <div key={member.id} className="flex items-center gap-3 py-3">
                  <Avatar className="size-9">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback>
                      {member.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.user.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {member.user.email}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {roleLabel(member.role)}
                  </span>
                  {canRemove ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            setMemberToRemove({
                              id: member.id,
                              name: member.user.name,
                            })
                          }
                        >
                          <X /> Remove member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              );
            })}
          </div>

          {activeOrganization && canManageMembers ? (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Pending invitations
                </h3>
              </div>
              {invitations.length ? (
                <div className="divide-border/40 divide-y">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="bg-muted flex size-9 items-center justify-center rounded-full">
                        <Mail className="text-muted-foreground size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {invitation.email}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Invited · expires{" "}
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-8"
                        disabled={management.isMutating}
                        onClick={() =>
                          management.cancelInvitation(invitation.id)
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
                  No pending invitations.
                </p>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="workspace" className="mt-0 pt-5">
          {!billing.isLoading && !billing.subscription?.hasPro ? (
            <ProUpgradePrompt feature="Team workspaces" />
          ) : (
            <div className="space-y-4">
              <div className="divide-border/40 divide-y rounded-lg border px-3">
                <div className="flex items-center gap-3 py-3">
                  <WorkspaceAvatar
                    name="Personal workspace"
                    image={session?.user.image}
                    className="size-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Personal workspace
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Private · Only you
                    </p>
                  </div>
                  {!activeOrganization ? (
                    <Check className="size-4 text-[#2383E2]" />
                  ) : null}
                </div>
                {organizations.map((organization) => (
                  <button
                    key={organization.id}
                    type="button"
                    className="hover:bg-muted/40 flex w-full items-center gap-3 py-3 text-left"
                    onClick={() => setActiveOrganization(organization.id)}
                  >
                    <WorkspaceAvatar
                      name={organization.name}
                      image={organization.logo}
                      className="size-9"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {organization.name}
                    </span>
                    {activeOrganization?.id === organization.id ? (
                      <Check className="size-4 text-[#2383E2]" />
                    ) : null}
                  </button>
                ))}
              </div>
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Plus /> Create new workspace
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {activeOrganization ? (
        <WorkspaceInviteDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          workspaceName={activeOrganization.name}
          isInviting={management.isMutating}
          onInvite={management.inviteMember}
        />
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new workspace</DialogTitle>
            <DialogDescription>
              Give your team workspace a clear name. You can invite people after
              it is created.
            </DialogDescription>
          </DialogHeader>
          <Input
            id="organization-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Workspace name"
            autoFocus
            maxLength={80}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void createOrganization();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void createOrganization()}
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Plus />
              )}
              {isCreating ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to this workspace and its pages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep member</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeSelectedMember}
              disabled={management.isMutating}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
