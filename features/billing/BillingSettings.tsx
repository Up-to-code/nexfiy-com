"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexfiyProCheckout } from "./NexfiyProCheckout";
import { useBilling } from "./use-billing";

function BillingRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-border/40 flex items-center justify-between gap-6 border-b py-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function BillingSettings() {
  const { isLoading, subscription, openPortal } = useBilling();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  const hasPro = subscription?.hasPro ?? false;
  const isAdminGrant = subscription?.source === "admin_grant";
  const status = !hasPro
    ? "Free"
    : subscription?.accessState === "grace"
      ? "Payment needs attention"
      : "Active";

  return (
    <div className="space-y-6">
      <div className="border-border/40 border-b pb-5">
        <h2 className="text-lg font-bold">Billing</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          View your current plan and manage billing.
        </p>
      </div>

      <div>
        <BillingRow
          label="Plan"
          value={hasPro ? "Nexfiy Pro" : "Nexfiy Free"}
        />
        <BillingRow
          label="Status"
          value={
            <span className="inline-flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${hasPro ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
              />
              {status}
            </span>
          }
        />
        <BillingRow
          label="Seats"
          value={hasPro ? (subscription?.quantity ?? 1) : 1}
        />
        <BillingRow
          label="Billing"
          value={
            isAdminGrant
              ? "Internal access"
              : hasPro
                ? subscription?.cancelAtNextBillingDate
                  ? "Cancels at period end"
                  : "Monthly"
                : "No payment method"
          }
        />
      </div>

      {hasPro ? (
        !isAdminGrant ? (
          <Button
            variant="outline"
            className="w-full justify-center"
            disabled={!subscription?.canManage}
            onClick={openPortal}
          >
            <CreditCard />
            {subscription?.canManage
              ? "Manage billing"
              : "Workspace owner manages billing"}
          </Button>
        ) : null
      ) : (
        <NexfiyProCheckout compact />
      )}
    </div>
  );
}
