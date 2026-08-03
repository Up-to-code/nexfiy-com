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
const resendApiUrl = "https://api.resend.com/emails";
const nexfiyProProductId =
  process.env.DODO_NEXFIY_PRO_PRODUCT_ID ?? "pdt_schema_generation";
const getProAccessForOwner = makeFunctionReference<
  "query",
  { ownerUserId: string },
  { hasPro: boolean; seatLimit: number }
>("billing:getProAccessForOwner");
const getProAccessForOrganization = makeFunctionReference<
  "query",
  { organizationId: string },
  { hasPro: boolean; seatLimit: number; seatUsage: number }
>("billing:getProAccessForOrganization");
const trustedOrigins = [
  siteUrl,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sendWorkspaceInvitation = async (
  data: {
    id: string;
    email: string;
    organization: { name: string };
    inviter: { user: { name: string } };
  },
  request?: Request,
) => {
  if (request?.headers.get("x-nexfiy-invite-delivery") === "link") {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send workspace invitations");
  }

  const invitationUrl = `${siteUrl}/accept-invitation?id=${encodeURIComponent(data.id)}`;
  const organizationName = escapeHtml(data.organization.name);
  const inviterName = escapeHtml(data.inviter.user.name);
  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Nexfiy <onboarding@resend.dev>",
      to: [data.email],
      subject: `Join ${data.organization.name} on Nexfiy`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#18181b"><h1 style="font-size:24px">You're invited to ${organizationName}</h1><p style="line-height:1.6">${inviterName} invited you to collaborate in their Nexfiy workspace.</p><p style="margin:28px 0"><a href="${invitationUrl}" style="background:#2383e2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a></p><p style="font-size:12px;color:#71717a">This invitation expires in 30 minutes.</p></div>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Resend rejected the invitation email (${response.status}): ${details}`,
    );
  }
};

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
    onAPIError: {
      errorURL: "/auth-error",
    },
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
        invitationExpiresIn: 30 * 60,
        sendInvitationEmail: sendWorkspaceInvitation,
        allowUserToCreateOrganization: async (user) => {
          if (!("runQuery" in ctx)) return false;
          return (
            await ctx.runQuery(getProAccessForOwner, { ownerUserId: user.id })
          ).hasPro;
        },
        membershipLimit: async (_user, workspace) => {
          if (!("runQuery" in ctx) || !workspace?.id) return 1;
          const ownerAccess = await ctx.runQuery(
            getProAccessForOrganization,
            { organizationId: workspace.id },
          );
          return ownerAccess.hasPro ? ownerAccess.seatLimit : 1;
        },
        invitationLimit: async ({ organization: workspace }) => {
          if (!("runQuery" in ctx)) return 0;
          const access = await ctx.runQuery(getProAccessForOrganization, {
            organizationId: workspace.id,
          });
          return access.hasPro
            ? Math.max(0, access.seatLimit - access.seatUsage)
            : 0;
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
