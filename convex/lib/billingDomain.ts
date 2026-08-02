import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type BillingCtx = QueryCtx | MutationCtx;

export const BILLING_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export type ProAccessState =
  "free" | "active" | "grace" | "past_due" | "cancelled";

export async function getLatestSubscriptionForUser(
  ctx: BillingCtx,
  ownerUserId: string,
) {
  return await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", ownerUserId))
    .order("desc")
    .first();
}

export async function getActiveEntitlementGrantForUser(
  ctx: BillingCtx,
  ownerUserId: string,
) {
  const grant = await ctx.db
    .query("entitlementGrants")
    .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", ownerUserId))
    .order("desc")
    .first();
  return grant?.status === "active" ? grant : null;
}

export async function getProEntitlementForUser(
  ctx: BillingCtx,
  ownerUserId: string,
) {
  const grant = await getActiveEntitlementGrantForUser(ctx, ownerUserId);
  if (grant) {
    return {
      source: "admin_grant" as const,
      hasPro: true,
      state: "active" as ProAccessState,
      seatLimit: grant.seatLimit,
      grant,
      subscription: null,
    };
  }

  const subscription = await getLatestSubscriptionForUser(ctx, ownerUserId);
  const access = resolveProAccess(subscription);
  return {
    source: subscription ? ("subscription" as const) : ("none" as const),
    hasPro: access.hasPro,
    state: access.state,
    seatLimit: subscription?.quantity ?? 1,
    grant: null,
    subscription,
  };
}

export function resolveProAccess(
  subscription: Awaited<ReturnType<typeof getLatestSubscriptionForUser>>,
  now = Date.now(),
) {
  if (!subscription) {
    return { hasPro: false, state: "free" as ProAccessState };
  }
  if (subscription.status === "active") {
    return { hasPro: true, state: "active" as ProAccessState };
  }
  if (
    (subscription.status === "on_hold" || subscription.status === "failed") &&
    (subscription.graceEndsAt ?? 0) > now
  ) {
    return { hasPro: true, state: "grace" as ProAccessState };
  }
  if (
    subscription.status === "cancelled" &&
    (subscription.accessThrough ?? subscription.nextBillingAt) > now
  ) {
    return { hasPro: true, state: "cancelled" as ProAccessState };
  }
  return {
    hasPro: false,
    state:
      subscription.status === "on_hold" || subscription.status === "failed"
        ? ("past_due" as ProAccessState)
        : ("free" as ProAccessState),
  };
}

export async function requireProForUser(ctx: BillingCtx, ownerUserId: string) {
  const entitlement = await getProEntitlementForUser(ctx, ownerUserId);
  if (!entitlement.hasPro) {
    throw new ConvexError({
      code: "PAYMENT_REQUIRED",
      message: "Nexfiy Pro is required for this feature",
    });
  }
  return entitlement;
}
