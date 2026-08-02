"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettingsModal";
import { useBilling } from "./use-billing";

export function BillingAccessBanner() {
  const searchParams = useSearchParams();
  const settings = useSettings();
  const { isLoading, subscription } = useBilling();
  const isCheckoutReturn = searchParams.get("billing") === "success";
  const isActivating = isCheckoutReturn && (isLoading || !subscription?.hasPro);
  const isGrace = subscription?.accessState === "grace";

  if (!isActivating && !isGrace) return null;

  return (
    <div className="border-border bg-background fixed inset-x-3 bottom-3 z-[80] mx-auto flex max-w-2xl items-center gap-3 rounded-xl border px-4 py-3 shadow-lg">
      {isActivating ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin text-[#2383e2]" />
      ) : (
        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {isActivating ? "Activating Pro…" : "Update your payment method"}
        </p>
        <p className="text-muted-foreground text-xs">
          {isActivating
            ? "Checkout is complete. Waiting for verified billing confirmation."
            : `Pro remains available until ${new Date(subscription!.graceEndsAt!).toLocaleDateString()}.`}
        </p>
      </div>
      {!isActivating ? (
        <Button size="sm" onClick={() => settings.onOpen("billing")}>
          Manage billing
        </Button>
      ) : null}
    </div>
  );
}
