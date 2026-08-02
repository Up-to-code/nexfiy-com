import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import {
  checkout,
  dodopayments,
  portal,
  webhooks,
} from "@dodopayments/better-auth";
import type { Subscription } from "@dodopayments/core";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import DodoPayments from "dodopayments";
import { makeFunctionReference } from "convex/server";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: { schema: authSchema },
  },
);

const DEFAULT_LOCAL_SITE_URL = "http://localhost:3000";

const resolveSiteUrl = () => {
  const configuredUrl = process.env.SITE_URL ?? DEFAULT_LOCAL_SITE_URL;
  const url = new URL(configuredUrl);
  const isLocalhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const isOfficialDomain =
    url.hostname === "nexfiy.com" || url.hostname.endsWith(".nexfiy.com");

  if (!isLocalhost && !isOfficialDomain) {
    throw new Error(
      "SITE_URL must use localhost for development or the official nexfiy.com domain.",
    );
  }

  return url.origin;
};

const siteUrl = resolveSiteUrl();
const nexfiyProProductId =
  process.env.DODO_NEXFIY_PRO_PRODUCT_ID ?? "pdt_schema_generation";
const getProAccessForOwner = makeFunctionReference<
  "query",
  { ownerUserId: string },
  { hasPro: boolean; seatLimit: number }
>("billing:getProAccessForOwner");
const trustedOrigins = [
  siteUrl,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const dodoPayments = new DodoPayments({
    bearerToken:
      process.env.DODO_PAYMENTS_API_KEY ?? "schema-generation-api-key",
    environment:
      process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
        ? "live_mode"
        : "test_mode",
  });

  const syncSubscription = async (subscription: Subscription) => {
    if (!("runMutation" in ctx)) {
      throw new Error("Subscription webhooks require an action context");
    }

    await ctx.runMutation(internal.billing.syncSubscription, {
      subscriptionId: subscription.subscription_id,
      productId: subscription.product_id,
      customerId: subscription.customer.customer_id,
      ownerUserId:
        typeof subscription.customer.metadata?.userId === "string"
          ? subscription.customer.metadata.userId
          : undefined,
      organizationId:
        typeof subscription.metadata.organizationId === "string"
          ? subscription.metadata.organizationId
          : undefined,
      planKey:
        typeof subscription.metadata.planKey === "string"
          ? subscription.metadata.planKey
          : "nexfiy_pro",
      status: subscription.status,
      quantity: subscription.quantity,
      currency: subscription.currency,
      recurringPreTaxAmount: subscription.recurring_pre_tax_amount,
      trialPeriodDays: subscription.trial_period_days,
      nextBillingAt: subscription.next_billing_date.getTime(),
      cancelAtNextBillingDate: subscription.cancel_at_next_billing_date,
    });
  };

  return {
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: async (user) => {
          if (!("runQuery" in ctx)) return false;
          return (
            await ctx.runQuery(getProAccessForOwner, { ownerUserId: user.id })
          ).hasPro;
        },
        membershipLimit: async (user) => {
          if (!("runQuery" in ctx)) return 1;
          const access = await ctx.runQuery(getProAccessForOwner, {
            ownerUserId: user.id,
          });
          return access.hasPro ? access.seatLimit : 1;
        },
        invitationLimit: async ({ user }) => {
          if (!("runQuery" in ctx)) return 0;
          const access = await ctx.runQuery(getProAccessForOwner, {
            ownerUserId: user.id,
          });
          return access.hasPro ? Math.max(0, access.seatLimit - 1) : 0;
        },
      }),
      dodopayments({
        client: dodoPayments,
        createCustomerOnSignUp: true,
        getCustomerParams: (user) => ({
          metadata: { userId: user.id },
        }),
        use: [
          checkout({
            products: [{ productId: nexfiyProProductId, slug: "nexfiy-pro" }],
            successUrl: `${siteUrl}/documents?billing=success`,
            authenticatedUsersOnly: true,
          }),
          portal(),
          webhooks({
            webhookKey:
              process.env.DODO_PAYMENTS_WEBHOOK_SECRET ??
              "schema-generation-webhook-secret",
            onSubscriptionActive: async ({ data }) => syncSubscription(data),
            onSubscriptionOnHold: async ({ data }) => syncSubscription(data),
            onSubscriptionRenewed: async ({ data }) => syncSubscription(data),
            onSubscriptionPlanChanged: async ({ data }) =>
              syncSubscription(data),
            onSubscriptionCancelled: async ({ data }) => syncSubscription(data),
            onSubscriptionFailed: async ({ data }) => syncSubscription(data),
            onSubscriptionExpired: async ({ data }) => syncSubscription(data),
            onSubscriptionUpdated: async ({ data }) => syncSubscription(data),
            onSubscriptionPaused: async ({ data }) => syncSubscription(data),
            onSubscriptionUpdatePaymentMethod: async ({ data }) =>
              syncSubscription(data),
          }),
        ],
      }),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const { getAuthUser } = authComponent.clientApi();
