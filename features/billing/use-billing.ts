"use client";

import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

const productId = process.env.NEXT_PUBLIC_DODO_NEXFIY_PRO_PRODUCT_ID;

export function useBilling() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const subscription = useQuery(
    api.billing.getMySubscription,
    session?.user ? {} : "skip",
  );

  const startCheckout = async (quantity: number) => {
    if (!session?.user) {
      window.location.href = "/sign-in?redirect=/pricing";
      return;
    }

    if (!productId) {
      toast.error("Billing is not configured yet.");
      return;
    }

    try {
      const { data, error } =
        await authClient.dodopayments.checkoutSession({
          product_cart: [{ product_id: productId, quantity }],
          metadata: {
            planKey: "nexfiy_pro",
            organizationId: activeOrganization?.id ?? "personal",
          },
          customization: {
            theme: "system",
            show_order_details: true,
          },
        });

      if (error || !data?.url) {
        throw new Error(error?.message ?? "Checkout session was not created");
      }

      window.location.href = data.url;
    } catch (error) {
      logger.error("Failed to start Dodo checkout", error);
      toast.error("Could not open checkout. Please try again.");
    }
  };

  const openPortal = async () => {
    try {
      const { data, error } =
        await authClient.dodopayments.customer.portal();

      if (error || !data?.url) {
        throw new Error(error?.message ?? "Customer portal was not created");
      }

      window.location.href = data.url;
    } catch (error) {
      logger.error("Failed to open Dodo customer portal", error);
      toast.error("Could not open billing settings. Please try again.");
    }
  };

  return {
    isAuthenticated: Boolean(session?.user),
    isLoading: isSessionPending || (Boolean(session?.user) && subscription === undefined),
    subscription: subscription ?? null,
    startCheckout,
    openPortal,
  };
}
