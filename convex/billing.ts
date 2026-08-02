import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import {
  BILLING_GRACE_MS,
  getLatestSubscriptionForUser,
  resolveProAccess,
} from "./lib/billingDomain";
import { getWorkspaceBillingScope } from "./lib/workspace";

const subscriptionStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("on_hold"),
  v.literal("cancelled"),
  v.literal("failed"),
  v.literal("expired"),
);

const subscriptionSummary = v.object({
  planKey: v.string(),
  status: subscriptionStatus,
  quantity: v.number(),
  currency: v.string(),
  recurringPreTaxAmount: v.number(),
  trialPeriodDays: v.number(),
  nextBillingAt: v.number(),
  cancelAtNextBillingDate: v.boolean(),
  accessState: v.union(
    v.literal("free"),
    v.literal("active"),
    v.literal("grace"),
    v.literal("past_due"),
    v.literal("cancelled"),
  ),
  hasPro: v.boolean(),
  graceEndsAt: v.union(v.number(), v.null()),
  accessThrough: v.union(v.number(), v.null()),
  canManage: v.boolean(),
});

const entitlementSummary = v.object({
  plan: v.union(v.literal("free"), v.literal("pro")),
  accessState: v.union(
    v.literal("free"),
    v.literal("active"),
    v.literal("grace"),
    v.literal("past_due"),
    v.literal("cancelled"),
  ),
  hasPro: v.boolean(),
  seatLimit: v.number(),
  seatUsage: v.number(),
  trialPeriodDays: v.number(),
  nextBillingAt: v.union(v.number(), v.null()),
  graceEndsAt: v.union(v.number(), v.null()),
  accessThrough: v.union(v.number(), v.null()),
  canManage: v.boolean(),
});

export const syncSubscription = internalMutation({
  args: {
    subscriptionId: v.string(),
    productId: v.string(),
    customerId: v.string(),
    ownerUserId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    planKey: v.string(),
    status: subscriptionStatus,
    quantity: v.number(),
    currency: v.string(),
    recurringPreTaxAmount: v.number(),
    trialPeriodDays: v.number(),
    nextBillingAt: v.number(),
    cancelAtNextBillingDate: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_subscription_id", (q) =>
        q.eq("subscriptionId", args.subscriptionId),
      )
      .unique();

    const now = Date.now();
    const isFailure = args.status === "on_hold" || args.status === "failed";
    const failureStartedAt = isFailure
      ? (existing?.failureStartedAt ?? now)
      : undefined;
    const graceEndsAt = failureStartedAt
      ? failureStartedAt + BILLING_GRACE_MS
      : undefined;
    const accessThrough =
      args.status === "active" || args.status === "cancelled"
        ? args.nextBillingAt
        : existing?.accessThrough;
    const values = {
      ...args,
      failureStartedAt,
      graceEndsAt,
      accessThrough,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, values);
    } else {
      await ctx.db.insert("billingSubscriptions", values);
    }

    return null;
  },
});

export const getMySubscription = query({
  args: {},
  returns: v.union(subscriptionSummary, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const scope = await getWorkspaceBillingScope(ctx, identity.subject);
    const subscription = await getLatestSubscriptionForUser(
      ctx,
      scope.billingOwnerId,
    );

    if (!subscription) {
      return null;
    }

    const access = resolveProAccess(subscription);
    return {
      planKey: subscription.planKey,
      status: subscription.status,
      quantity: subscription.quantity,
      currency: subscription.currency,
      recurringPreTaxAmount: subscription.recurringPreTaxAmount,
      trialPeriodDays: subscription.trialPeriodDays,
      nextBillingAt: subscription.nextBillingAt,
      cancelAtNextBillingDate: subscription.cancelAtNextBillingDate,
      accessState: access.state,
      hasPro: access.hasPro,
      graceEndsAt: subscription.graceEndsAt ?? null,
      accessThrough: subscription.accessThrough ?? null,
      canManage: scope.billingOwnerId === identity.subject,
    };
  },
});

export const getMyEntitlement = query({
  args: {},
  returns: entitlementSummary,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        plan: "free" as const,
        accessState: "free" as const,
        hasPro: false,
        seatLimit: 1,
        seatUsage: 1,
        trialPeriodDays: 0,
        nextBillingAt: null,
        graceEndsAt: null,
        accessThrough: null,
        canManage: false,
      };
    }
    const scope = await getWorkspaceBillingScope(ctx, identity.subject);
    const subscription = await getLatestSubscriptionForUser(
      ctx,
      scope.billingOwnerId,
    );
    const access = resolveProAccess(subscription);
    return {
      plan: access.hasPro ? ("pro" as const) : ("free" as const),
      accessState: access.state,
      hasPro: access.hasPro,
      seatLimit: subscription?.quantity ?? 1,
      seatUsage: 1,
      trialPeriodDays: subscription?.trialPeriodDays ?? 0,
      nextBillingAt: subscription?.nextBillingAt ?? null,
      graceEndsAt: subscription?.graceEndsAt ?? null,
      accessThrough: subscription?.accessThrough ?? null,
      canManage:
        Boolean(subscription) && scope.billingOwnerId === identity.subject,
    };
  },
});

export const getProAccessForOwner = internalQuery({
  args: { ownerUserId: v.string() },
  returns: v.object({ hasPro: v.boolean(), seatLimit: v.number() }),
  handler: async (ctx, args) => {
    const subscription = await getLatestSubscriptionForUser(
      ctx,
      args.ownerUserId,
    );
    return {
      hasPro: resolveProAccess(subscription).hasPro,
      seatLimit: subscription?.quantity ?? 1,
    };
  },
});
