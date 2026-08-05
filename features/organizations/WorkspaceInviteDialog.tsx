"use client";

import { useState } from "react";
import { Check, Copy, Link2, Mail } from "lucide-react";
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
import { useI18n } from "@/lib/i18n/I18nProvider";

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
  const { t } = useI18n();
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
      toast.success(t("dialogs.inviteSent"));
      onOpenChange(false);
      reset();
      return;
    }

    setInviteLink(link);
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("dialogs.inviteLinkCopied"));
    } catch (error) {
      logger.error("Failed to copy workspace invitation link", error);
      toast.error(t("dialogs.inviteCopyManually"));
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
      <DialogContent className="w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-lg">
        <DialogHeader className="border-border/50 border-b px-6 py-5">
          <DialogTitle>
            {t("dialogs.inviteTitle", { name: workspaceName })}
          </DialogTitle>
          <DialogDescription>
            {t("dialogs.inviteDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as typeof mode)}
        >
          <TabsList
            variant="line"
            className="border-border/50 grid h-12 w-full grid-cols-2 border-b px-6"
          >
            <TabsTrigger value="email" className="h-full px-0">
              <Mail className="size-4" /> {t("dialogs.inviteEmailTab")}
            </TabsTrigger>
            <TabsTrigger value="link" className="h-full px-0">
              <Link2 className="size-4" /> {t("dialogs.inviteLinkTab")}
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 px-6 py-5">
            <TabsContent value="email" className="mt-0 space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium">
                {t("dialogs.inviteEmailAddress")}
              </label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("dialogs.inviteEmailPlaceholder")}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                {t("dialogs.inviteExpiry")}
              </p>
            </TabsContent>

            <TabsContent value="link" className="mt-0 space-y-2">
              <label
                htmlFor="invite-link-email"
                className="text-sm font-medium"
              >
                {t("dialogs.inviteRecipientEmail")}
              </label>
              <Input
                id="invite-link-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("dialogs.inviteEmailPlaceholder")}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                {t("dialogs.inviteLinkRestriction")}
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

        <DialogFooter className="border-border/50 flex-wrap border-t px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            onClick={createInvitation}
            disabled={isInviting || !email.trim()}
          >
            {!isInviting && mode === "email" ? (
              <Mail />
            ) : !isInviting ? (
              <Copy />
            ) : null}
            {isInviting
              ? t("dialogs.inviteCreating")
              : mode === "email"
                ? t("dialogs.inviteSend")
                : t("dialogs.inviteCreateAndCopy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
