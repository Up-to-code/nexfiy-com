"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ProUpgradePrompt } from "@/features/billing/ProUpgradePrompt";
import { useBilling } from "@/features/billing/use-billing";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { uploadFile } from "@/lib/uploadthing";
import { useSettings } from "@/hooks/useSettingsModal";
import { api } from "@/convex/_generated/api";
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
  const [isPreparingInvite, setIsPreparingInvite] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState<{
    workspaceId: string;
    name: string;
    logo: string;
  } | null>(null);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isUploadingWorkspaceImage, setIsUploadingWorkspaceImage] =
    useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
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
  const settings = useSettings();
  const attachPersonalWorkspace = useMutation(
    api.organizationWorkspaces.attachPersonalWorkspace,
  );
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
  const editableWorkspaceId = activeOrganization?.id ?? "personal";

  const workspaceName = activeOrganization
    ? workspaceDraft && workspaceDraft.workspaceId === activeOrganization.id
      ? workspaceDraft.name
      : activeOrganization.name
    : workspaceDraft?.workspaceId === "personal"
      ? workspaceDraft.name
      : (session?.user.name ?? "Personal workspace");
  const workspaceLogo = activeOrganization
    ? workspaceDraft && workspaceDraft.workspaceId === activeOrganization.id
      ? workspaceDraft.logo
      : (activeOrganization.logo ?? "")
    : workspaceDraft?.workspaceId === "personal"
      ? workspaceDraft.logo
      : (session?.user.image ?? "");

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
      settings.consumeAction();
      toast.success("Workspace created.");
    } catch (error) {
      logger.error("Failed to create organization", error);
      toast.error("Could not create workspace. Try a different name.");
    } finally {
      setIsCreating(false);
    }
  };

  const openInviteForSelectedWorkspace = async () => {
    if (activeOrganization) {
      setIsInviteOpen(true);
      return;
    }
    if (!session?.user || isPreparingInvite) return;

    setIsPreparingInvite(true);
    try {
      const workspaceName = `${session.user.name}'s workspace`;
      const { data, error } = await authClient.organization.create({
        name: workspaceName,
        slug: `${toSlug(session.user.name)}-${Date.now().toString(36)}`,
        logo: session.user.image ?? undefined,
      });
      if (error || !data) {
        throw new Error(error?.message ?? "Workspace could not be shared");
      }
      const { error: activeError } = await authClient.organization.setActive({
        organizationId: data.id,
      });
      if (activeError) throw new Error(activeError.message);
      await attachPersonalWorkspace();
      await refreshActiveOrganization();
      setIsInviteOpen(true);
      toast.success("This workspace is ready for collaborators.");
    } catch (error) {
      logger.error("Failed to prepare workspace invitation", error);
      toast.error(
        error instanceof Error ? error.message : "Could not open invitations.",
      );
    } finally {
      setIsPreparingInvite(false);
    }
  };

  const removeSelectedMember = async () => {
    if (!memberToRemove) return;
    await management.removeMember(memberToRemove.id);
    setMemberToRemove(null);
  };

  const saveWorkspace = async () => {
    const trimmedName = workspaceName.trim();
    if (!trimmedName) {
      toast.error("Enter a workspace name.");
      return;
    }
    setIsSavingWorkspace(true);
    try {
      const { error } = activeOrganization
        ? await authClient.organization.update({
            organizationId: activeOrganization.id,
            data: {
              name: trimmedName,
              slug: toSlug(trimmedName),
              logo: workspaceLogo.trim() || undefined,
            },
          })
        : await authClient.updateUser({
            name: trimmedName,
            image: workspaceLogo.trim() || undefined,
          });
      if (error) throw new Error(error.message ?? "Workspace was not updated");
      await refreshActiveOrganization();
      setWorkspaceDraft(null);
      toast.success("Workspace updated.");
    } catch (error) {
      logger.error("Failed to update organization", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update workspace.",
      );
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const uploadWorkspaceImage = async (file: File) => {
    setIsUploadingWorkspaceImage(true);
    try {
      const logo = await uploadFile("avatarImage", file);
      setWorkspaceDraft({
        workspaceId: editableWorkspaceId,
        name: workspaceName,
        logo,
      });
    } catch (error) {
      logger.error("Failed to upload workspace image", error);
      toast.error("Could not upload workspace image.");
    } finally {
      setIsUploadingWorkspaceImage(false);
    }
  };

  const deleteWorkspace = async () => {
    if (!activeOrganization || deleteConfirmation !== activeOrganization.name)
      return;
    try {
      const { error } = await authClient.organization.delete({
        organizationId: activeOrganization.id,
      });
      if (error) throw new Error(error.message ?? "Workspace was not deleted");
      setIsDeleteOpen(false);
      setDeleteConfirmation("");
      await setActiveOrganization(null);
      toast.success("Workspace deleted.");
    } catch (error) {
      logger.error("Failed to delete organization", error);
      toast.error(
        error instanceof Error ? error.message : "Could not delete workspace.",
      );
    }
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
            {view === "people" && (canManageMembers || !activeOrganization) ? (
              <Button
                size="sm"
                className="h-8"
                onClick={() => void openInviteForSelectedWorkspace()}
                disabled={
                  management.isMutating ||
                  isPreparingInvite ||
                  (!activeOrganization && !billing.subscription?.hasPro)
                }
              >
                {!isPreparingInvite ? (
                  <Plus className="size-3.5" />
                ) : null}{" "}
                {isPreparingInvite ? "Preparing invite…" : "Invite"}
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
          <div className="space-y-7">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Workspace profile</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Change the name and image people see for this workspace.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <WorkspaceAvatar
                  name={workspaceName}
                  image={workspaceLogo}
                  className="size-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {activeOrganization
                      ? activeOrganization.name
                      : session?.user.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {activeOrganization
                      ? `${memberCount} members · Workspace owner`
                      : `${session?.user.email ?? ""} · Account owner`}
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                <label className="block text-xs font-medium">
                  <span className="mb-2 block">Workspace name</span>
                  <Input
                    value={workspaceName}
                    onChange={(event) =>
                      setWorkspaceDraft({
                        workspaceId: editableWorkspaceId,
                        name: event.target.value,
                        logo: workspaceLogo,
                      })
                    }
                    maxLength={80}
                  />
                </label>
                <div className="text-xs font-medium">
                  <span className="mb-2 block">Workspace image</span>
                  <label className="border-border/60 hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors">
                    {isUploadingWorkspaceImage ? (
                      <>
                        <Skeleton className="size-8 rounded-md" />
                        <Skeleton className="h-4 w-32" />
                      </>
                    ) : (
                      <>
                        <WorkspaceAvatar
                          name={workspaceName}
                          image={workspaceLogo}
                          className="size-8"
                        />
                        <span className="text-sm font-medium">
                          Upload a new image
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={isUploadingWorkspaceImage}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadWorkspaceImage(file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => void saveWorkspace()}
                    disabled={isSavingWorkspace || !workspaceName.trim()}
                  >
                    {isSavingWorkspace ? (
                      <LoaderCircle className="animate-spin" />
                    ) : null}
                    Save changes
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Your workspaces</h3>
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
              {!billing.isLoading && !billing.subscription?.hasPro ? (
                <ProUpgradePrompt feature="Team workspaces" />
              ) : (
                <button
                  type="button"
                  className="text-sm font-medium text-[#2383E2] hover:underline"
                  onClick={() => setIsCreateOpen(true)}
                >
                  Add a new workspace
                </button>
              )}
            </section>

            {activeOrganization ? (
              <section className="border-destructive/30 space-y-3 border-t pt-5">
                <div>
                  <h3 className="text-sm font-semibold">Delete workspace</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Permanently remove this workspace and revoke member access.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  Delete workspace
                </Button>
              </section>
            ) : null}
          </div>
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

      <Dialog
        open={
          isCreateOpen ||
          (settings.action === "create-workspace" && view === "workspace")
        }
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) settings.consumeAction();
        }}
      >
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

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {activeOrganization?.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the workspace. Type the workspace name to
              confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={activeOrganization?.name}
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !activeOrganization ||
                deleteConfirmation !== activeOrganization.name
              }
              onClick={() => void deleteWorkspace()}
            >
              Delete permanently
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
