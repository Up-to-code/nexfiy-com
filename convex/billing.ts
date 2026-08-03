import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, internalQuery, query } from "./_generated/server";
import {
  BILLING_GRACE_MS,
  getProEntitlementForUser,
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
  source: v.union(v.literal("subscription"), v.literal("admin_grant")),
  planKey: v.string(),
  status: subscriptionStatus,
  quantity: v.number(),
  currency: v.string(),
  recurringPreTaxAmount: v.number(),
  trialPeriodDays: v.number(),
  nextBillingAt: v.union(v.number(), v.null()),
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
  source: v.union(
    v.literal("none"),
    v.literal("subscription"),
    v.literal("admin_grant"),
  ),
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

const ADMIN_EMAIL = "ahmedmansour20251@icloud.com";
const ADMIN_SEAT_LIMIT = 25;

type BetterAuthUser = {
  _id: string;
  email: string;
  emailVerified: boolean;
};

type BetterAuthAccount = {
  providerId: string;
  userId: string;
};

type BetterAuthMember = {
  organizationId: string;
  userId: string;
  role: string;
};

async function organizationMembers(
  ctx: Parameters<typeof getProEntitlementForUser>[0],
  organizationId: string,
) {
  const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "member",
    where: [{ field: "organizationId", value: organizationId }],
    paginationOpts: { numItems: 500, cursor: null },
    limit: 500,
  })) as { page: BetterAuthMember[] };

  return result.page;
}

export const seedVerifiedAppleAdminGrant = internalMutation({
  args: { email: v.string() },
  returns: v.id("entitlementGrants"),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (email !== ADMIN_EMAIL) {
      throw new Error("This email is not eligible for the Nexfiy admin grant");
    }

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: email }],
    })) as BetterAuthUser | null;
    if (!user || user.email.toLowerCase() !== email || !user.emailVerified) {
      throw new Error("The verified Apple account does not exist yet");
    }

    const appleAccount = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "account",
        where: [
          { field: "userId", value: user._id },
          { field: "providerId", value: "apple" },
        ],
      },
    )) as BetterAuthAccount | null;
    if (!appleAccount || appleAccount.userId !== user._id) {
      throw new Error("The account must be linked to Sign in with Apple");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("entitlementGrants")
      .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", user._id))
      .order("desc")
      .first();
    const values = {
      ownerUserId: user._id,
      email,
      source: "admin_grant" as const,
      status: "active" as const,
      seatLimit: ADMIN_SEAT_LIMIT,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }
    return await ctx.db.insert("entitlementGrants", {
      ...values,
      createdAt: now,
    });
  },
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
    const entitlement = await getProEntitlementForUser(
      ctx,
      scope.billingOwnerId,
    );
    const subscription = entitlement.subscription;

    if (!subscription && !entitlement.grant) {
      return null;
    }

    if (entitlement.grant) {
      return {
        source: "admin_grant" as const,
        planKey: "admin_pro",
        status: "active" as const,
        quantity: entitlement.seatLimit,
        currency: "USD",
        recurringPreTaxAmount: 0,
        trialPeriodDays: 0,
        nextBillingAt: null,
        cancelAtNextBillingDate: false,
        accessState: "active" as const,
        hasPro: true,
        graceEndsAt: null,
        accessThrough: null,
        canManage: false,
      };
    }

    const access = resolveProAccess(subscription!);
    return {
      source: "subscription" as const,
      planKey: subscription!.planKey,
      status: subscription!.status,
      quantity: subscription!.quantity,
      currency: subscription!.currency,
      recurringPreTaxAmount: subscription!.recurringPreTaxAmount,
      trialPeriodDays: subscription!.trialPeriodDays,
      nextBillingAt: subscription!.nextBillingAt,
      cancelAtNextBillingDate: subscription!.cancelAtNextBillingDate,
      accessState: access.state,
      hasPro: access.hasPro,
      graceEndsAt: subscription!.graceEndsAt ?? null,
      accessThrough: subscription!.accessThrough ?? null,
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
        source: "none" as const,
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
    const entitlement = await getProEntitlementForUser(
      ctx,
      scope.billingOwnerId,
    );
    const subscription = entitlement.subscription;
    const members = scope.organizationId
      ? await organizationMembers(ctx, scope.organizationId)
      : null;
    return {
      source: entitlement.source,
      plan: entitlement.hasPro ? ("pro" as const) : ("free" as const),
      accessState: entitlement.state,
      hasPro: entitlement.hasPro,
      seatLimit: entitlement.seatLimit,
      seatUsage: members?.length ?? 1,
      trialPeriodDays: subscription?.trialPeriodDays ?? 0,
      nextBillingAt: subscription?.nextBillingAt ?? null,
      graceEndsAt: subscription?.graceEndsAt ?? null,
      accessThrough: subscription?.accessThrough ?? null,
      canManage:
        entitlement.source === "subscription" &&
        scope.billingOwnerId === identity.subject,
    };
  },
});

export const getProAccessForOwner = internalQuery({
  args: { ownerUserId: v.string() },
  returns: v.object({ hasPro: v.boolean(), seatLimit: v.number() }),
  handler: async (ctx, args) => {
    const entitlement = await getProEntitlementForUser(ctx, args.ownerUserId);
    return {
      hasPro: entitlement.hasPro,
      seatLimit: entitlement.seatLimit,
    };
  },
});

export const getProAccessForOrganization = internalQuery({
  args: { organizationId: v.string() },
  returns: v.object({
    hasPro: v.boolean(),
    seatLimit: v.number(),
    seatUsage: v.number(),
  }),
  handler: async (ctx, args) => {
    const alias = await ctx.db
      .query("workspaceAliases")
      .withIndex("by_organization", (query) =>
        query.eq("organizationId", args.organizationId),
      )
      .unique();
    const members = await organizationMembers(ctx, args.organizationId);
    const owner = members.find((member) =>
      member.role
        .split(",")
        .some((role) => role.trim() === "owner"),
    );
    const ownerUserId = alias?.workspaceId ?? owner?.userId;
    if (!ownerUserId) {
      return { hasPro: false, seatLimit: 1, seatUsage: members.length };
    }
    const entitlement = await getProEntitlementForUser(ctx, ownerUserId);
    return {
      hasPro: entitlement.hasPro,
      seatLimit: entitlement.seatLimit,
      seatUsage: members.length,
    };
  },
});
