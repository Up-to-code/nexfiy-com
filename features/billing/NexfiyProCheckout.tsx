"use client";

import { useState } from "react";
import { ArrowRight, CreditCard, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBilling } from "./use-billing";
import { NEXFIY_PRO_PLAN } from "./plan-content";

type NexfiyProCheckoutProps = {
  compact?: boolean;
  className?: string;
};

export function NexfiyProCheckout({
  compact = false,
  className,
}: NexfiyProCheckoutProps) {
  const [seats, setSeats] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading, subscription, startCheckout, openPortal } = useBilling();
  const hasPaidAccess = subscription?.hasPro ?? false;

  const updateSeats = (nextSeats: number) => {
    setSeats(Math.min(100, Math.max(1, Math.floor(nextSeats) || 1)));
  };

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      if (hasPaidAccess && subscription?.canManage) {
        await openPortal();
      } else if (!hasPaidAccess) {
        await startCheckout(seats);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!hasPaidAccess && (
        <div className="space-y-2">
          <label htmlFor="nexfiy-seats" className="text-sm font-medium">
            Seats
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove a seat"
              onClick={() => updateSeats(seats - 1)}
              disabled={seats === 1}
            >
              <Minus />
            </Button>
            <Input
              id="nexfiy-seats"
              type="number"
              min={1}
              max={100}
              value={seats}
              onChange={(event) => updateSeats(Number(event.target.value))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Add a seat"
              onClick={() => updateSeats(seats + 1)}
              disabled={seats === 100}
            >
              <Plus />
            </Button>
            <p className="text-muted-foreground ml-1 text-sm">
              ${seats * NEXFIY_PRO_PLAN.price}/month after trial
            </p>
          </div>
        </div>
      )}

      {hasPaidAccess && (
        <div className="bg-muted/50 rounded-md border p-3 text-sm">
          <p className="font-medium">
            {subscription?.accessState === "grace"
              ? "Pro payment needs attention"
              : "Nexfiy Pro is active"}
          </p>
          <p className="text-muted-foreground mt-1">
            {subscription!.quantity}{" "}
            {subscription!.quantity === 1 ? "seat" : "seats"}
            {subscription?.accessState === "grace" && subscription.graceEndsAt
              ? ` · Access through ${new Date(subscription.graceEndsAt).toLocaleDateString()}`
              : subscription!.cancelAtNextBillingDate
                ? " · Cancels at the next billing date"
                : " · Monthly billing"}
          </p>
        </div>
      )}

      <Button
        type="button"
        size={compact ? "default" : "lg"}
        className="w-full"
        disabled={
          isLoading ||
          isSubmitting ||
          (hasPaidAccess && !subscription?.canManage)
        }
        onClick={handleAction}
      >
        {hasPaidAccess ? <CreditCard /> : null}
        {isSubmitting
          ? "Opening…"
          : hasPaidAccess
            ? subscription?.canManage
              ? "Manage billing"
              : "Workspace owner manages billing"
            : `Start ${NEXFIY_PRO_PLAN.trialLabel}`}
        {!hasPaidAccess ? <ArrowRight /> : null}
      </Button>
    </div>
  );
}
