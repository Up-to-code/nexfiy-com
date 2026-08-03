"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, LogOut, Save, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { deleteUploadedFiles, uploadFile } from "@/lib/uploadthing";

type AccountProfileProps = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  onClose: () => void;
  refreshSession: () => Promise<unknown>;
};

function AccountSettingsSkeleton() {
  return (
    <div className="space-y-7" aria-label="Loading account settings">
      <div className="space-y-2 border-b pb-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-56" />
          </div>
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function AccountProfile({
  user,
  onClose,
  refreshSession,
}: AccountProfileProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const updateProfile = async (values: {
    name?: string;
    image?: string | null;
  }) => {
    const { error } = await authClient.updateUser(values);
    if (error) throw new Error(error.message ?? "Profile was not updated");
    await refreshSession();
  };

  const saveName = async () => {
    const nextName = name.trim();
    if (!nextName || nextName === user.name) return;

    setIsSavingName(true);
    try {
      await updateProfile({ name: nextName });
      toast.success("Name updated.");
    } catch (error) {
      logger.error("Failed to update account name", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update name.",
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const changeAvatar = async (file?: File) => {
    if (!file) return;
    setIsUploadingAvatar(true);
    let uploadedUrl: string | null = null;
    try {
      uploadedUrl = await uploadFile("avatarImage", file);
      await updateProfile({ image: uploadedUrl });
      if (user.image) await deleteUploadedFiles([user.image]);
      toast.success("Profile photo updated.");
    } catch (error) {
      logger.error("Failed to update profile photo", error);
      if (uploadedUrl)
        await deleteUploadedFiles([uploadedUrl]).catch(() => undefined);
      toast.error(
        error instanceof Error ? error.message : "Could not update photo.",
      );
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await updateProfile({ image: null });
      if (user.image) await deleteUploadedFiles([user.image]);
      toast.success("Profile photo removed.");
    } catch (error) {
      logger.error("Failed to remove profile photo", error);
      toast.error("Could not remove photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      posthog.reset();
      onClose();
      router.push("/");
      router.refresh();
    } catch (error) {
      logger.error("Failed to sign out", error);
      toast.error("Could not log out.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-border/40 border-b pb-5">
        <h2 className="text-lg font-bold">Account</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your profile and login information.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Profile</h3>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="group focus-visible:ring-ring relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Change profile photo"
          >
            <Avatar className="size-14 border">
              <AvatarImage
                src={user.image ?? undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-base font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              {isUploadingAvatar ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => void changeAvatar(event.target.files?.[0])}
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="account-name" className="text-xs">
              Preferred name
            </Label>
            <div className="flex gap-2">
              <Input
                id="account-name"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveName();
                }}
                className="h-8 max-w-xs text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={
                  isSavingName || !name.trim() || name.trim() === user.name
                }
                onClick={saveName}
              >
                {isSavingName ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Save />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
        {user.image ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-7 px-0 text-xs hover:bg-transparent"
            disabled={isUploadingAvatar}
            onClick={removeAvatar}
          >
            <Trash2 className="size-3.5" /> Remove photo
          </Button>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="border-border/40 border-b pb-3 text-sm font-semibold">
          Account security
        </h3>
        <div className="flex items-center justify-between gap-6 py-3">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{user.email}</p>
          </div>
          <span className="text-muted-foreground text-xs">
            Verified account
          </span>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="border-border/40 border-b pb-3 text-sm font-semibold">
          Sessions
        </h3>
        <div className="flex items-center justify-between gap-6 py-3">
          <div>
            <p className="text-sm font-medium">Log out of this device</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              End your current Nexfiy session.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={signOut}
          >
            <LogOut /> Log out
          </Button>
        </div>
      </section>
    </div>
  );
}

export function AccountSettings({ onClose }: { onClose: () => void }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  if (isPending) return <AccountSettingsSkeleton />;
  if (!session?.user) return null;

  return (
    <AccountProfile
      key={`${session.user.id}:${session.user.name}:${session.user.image ?? ""}`}
      user={session.user}
      onClose={onClose}
      refreshSession={refetch}
    />
  );
}
