"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

export function AcceptInvitationClient({
  invitationId,
}: {
  invitationId: string | null;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isAccepting, setIsAccepting] = useState(false);
  const callbackUrl = invitationId
    ? `/accept-invitation?id=${encodeURIComponent(invitationId)}`
    : "/accept-invitation";

  const acceptInvitation = async () => {
    if (!invitationId) return;

    setIsAccepting(true);
    try {
      const { error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (error) {
        throw new Error(error.message ?? "Invitation was not accepted");
      }

      toast.success("Welcome to the workspace.");
      router.push("/documents");
      router.refresh();
    } catch (error) {
      logger.error("Failed to accept organization invitation", error);
      toast.error(
        error instanceof Error ? error.message : "Could not accept invitation.",
      );
    } finally {
      setIsAccepting(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <LoaderCircle className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-center">
      <MailCheck className="mx-auto mb-5 size-10 text-[#2383e2]" />
      <h1 className="text-2xl font-bold tracking-tight">
        Workspace invitation
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {!invitationId
          ? "This invitation link is incomplete. Ask the workspace owner to send it again."
          : session
            ? `Accept this invitation as ${session.user.email}.`
            : "Sign in or create an account with the invited email address to continue."}
      </p>

      {invitationId && session ? (
        <Button
          className="mt-6 h-11 w-full rounded-xl bg-[#2383e2] text-white hover:bg-[#1d6fc2]"
          onClick={acceptInvitation}
          disabled={isAccepting}
        >
          {isAccepting ? <LoaderCircle className="animate-spin" /> : null}
          {isAccepting ? "Accepting…" : "Accept invitation"}
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
              Sign in
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link
              href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              Create account
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
