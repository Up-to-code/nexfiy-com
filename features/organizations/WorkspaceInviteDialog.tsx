"use client";

import { useState } from "react";
import { Check, Copy, Link2, LoaderCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

type WorkspaceInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  isInviting: boolean;
  onInvite: (
    email: string,
    delivery: "email" | "link",
  ) => Promise<string | null>;
};

export function WorkspaceInviteDialog({
  open,
  onOpenChange,
  workspaceName,
  isInviting,
  onInvite,
}: WorkspaceInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"email" | "link">("email");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setInviteLink(null);
    setMode("email");
  };

  const createInvitation = async () => {
    if (!email.trim()) return;
    const invitationId = await onInvite(email, mode);
    if (!invitationId) return;

    const link = `${window.location.origin}/accept-invitation?id=${encodeURIComponent(invitationId)}`;
    if (mode === "email") {
      toast.success("Invitation email sent.");
      onOpenChange(false);
      reset();
      return;
    }

    setInviteLink(link);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied.");
    } catch (error) {
      logger.error("Failed to copy workspace invitation link", error);
      toast.error("Invitation created. Copy the link below manually.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden rounded-xl p-0 sm:max-w-md">
        <DialogHeader className="border-border/50 border-b px-6 py-5">
          <DialogTitle>Invite to {workspaceName}</DialogTitle>
          <DialogDescription>
            Invitations are tied to the recipient&apos;s email for security.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as typeof mode)}
        >
          <TabsList
            variant="line"
            className="border-border/50 h-12 w-full justify-start gap-8 border-b px-6"
          >
            <TabsTrigger value="email" className="h-full px-0">
              <Mail className="size-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="link" className="h-full px-0">
              <Link2 className="size-4" /> Invite link
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 px-6 py-5">
            <TabsContent value="email" className="mt-0 space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                We&apos;ll send a secure invitation that expires in 30 minutes.
              </p>
            </TabsContent>

            <TabsContent value="link" className="mt-0 space-y-2">
              <label
                htmlFor="invite-link-email"
                className="text-sm font-medium"
              >
                Recipient email
              </label>
              <Input
                id="invite-link-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                The link will only work for an account using this email address.
              </p>
              {inviteLink ? (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="bg-muted/40 hover:bg-muted/70 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors"
                >
                  <Check className="size-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1 truncate">{inviteLink}</span>
                  <Copy className="size-3.5 shrink-0" />
                </button>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-border/50 border-t px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={createInvitation}
            disabled={isInviting || !email.trim()}
          >
            {isInviting ? (
              <LoaderCircle className="animate-spin" />
            ) : mode === "email" ? (
              <Mail />
            ) : (
              <Copy />
            )}
            {isInviting
              ? "Creating…"
              : mode === "email"
                ? "Send invite"
                : "Create and copy link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
