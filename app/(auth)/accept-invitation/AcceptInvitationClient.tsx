"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function AcceptInvitationClient({
  invitationId,
}: {
  invitationId: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { data: session, isPending } = authClient.useSession();
  const [isAccepting, setIsAccepting] = useState(false);
  const callbackUrl = invitationId
    ? `/accept-invitation?id=${encodeURIComponent(invitationId)}`
    : "/accept-invitation";

  const acceptInvitation = async () => {
    if (!invitationId) return;

    setIsAccepting(true);
    try {
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (error || !data) {
        throw new Error(error?.message ?? t("invite.notAccepted"));
      }

      const { error: activeError } = await authClient.organization.setActive({
        organizationId: data.invitation.organizationId,
      });
      if (activeError) {
        throw new Error(
          activeError.message ?? t("invite.workspaceOpenFailed"),
        );
      }

      toast.success(t("invite.welcome"));
      router.push("/documents");
      router.refresh();
    } catch (error) {
      logger.error("Failed to accept organization invitation", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("invite.couldNotAccept"),
      );
    } finally {
      setIsAccepting(false);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-4 py-8">
        <Skeleton className="mx-auto size-10 rounded-full" />
        <Skeleton className="mx-auto h-7 w-52" />
        <Skeleton className="mx-auto h-4 w-72 max-w-full" />
        <Skeleton className="mt-6 h-11 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="text-center">
      <MailCheck className="mx-auto mb-5 size-10 text-[#2383e2]" />
      <h1 className="text-2xl font-bold tracking-tight">
        {t("invite.title")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {!invitationId
          ? t("invite.incompleteLink")
          : session
            ? t("invite.acceptAs", { email: session.user.email })
            : t("invite.signInOrCreate")}
      </p>

      {invitationId && session ? (
        <Button
          className="mt-6 h-11 w-full rounded-xl bg-[#2383e2] text-white hover:bg-[#1d6fc2]"
          onClick={acceptInvitation}
          disabled={isAccepting}
        >
          {isAccepting ? t("invite.accepting") : t("invite.acceptButton")}
        </Button>
      ) : null}

      {invitationId && !session ? (
        <div className="mt-6 grid gap-3">
          <Button
            asChild
            className="h-11 rounded-xl bg-[#2383e2] text-white hover:bg-[#1d6fc2]"
          >
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              {t("invite.signIn")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link
              href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              {t("invite.createAccount")}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
