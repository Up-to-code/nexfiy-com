import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent, createAuth } from "../auth";

type WorkspaceCtx = QueryCtx | MutationCtx;

/**
 * Resolve the current document workspace entirely from the authenticated
 * Better Auth session. Existing personal documents keep their original user
 * subject as the scope; organization documents use a namespaced organization
 * id so the two namespaces can never collide.
 */
export async function getWorkspaceScope(
  ctx: WorkspaceCtx,
  personalUserId: string,
) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const activeOrganizationId = session?.session.activeOrganizationId;

  if (!activeOrganizationId) return personalUserId;
  const alias = await ctx.db
    .query("workspaceAliases")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", activeOrganizationId),
    )
    .unique();
  return alias?.workspaceId ?? `organization:${activeOrganizationId}`;
}

/**
 * Resolve both the active workspace and the account that pays for it. Personal
 * workspaces are paid by the current user; organization workspaces inherit the
 * subscription of their Better Auth owner.
 */
export async function getWorkspaceBillingScope(
  ctx: WorkspaceCtx,
  personalUserId: string,
) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const activeOrganizationId = session?.session.activeOrganizationId;

  if (!activeOrganizationId) {
    return { workspaceId: personalUserId, billingOwnerId: personalUserId };
  }

  const alias = await ctx.db
    .query("workspaceAliases")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", activeOrganizationId),
    )
    .unique();

  const organization = await auth.api.getFullOrganization({
    headers,
    query: { organizationId: activeOrganizationId },
  });
  const owner = organization?.members.find(
    (member: { role: string; userId: string }) =>
      String(member.role)
        .split(",")
        .some((role) => role.trim() === "owner"),
  );

  if (!owner) {
    throw new Error("The active workspace does not have an owner");
  }

  return {
    workspaceId: alias?.workspaceId ?? `organization:${activeOrganizationId}`,
    billingOwnerId: owner.userId,
  };
}

export async function getWorkspaceManagementScope(
  ctx: WorkspaceCtx,
  personalUserId: string,
) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const activeOrganizationId = session?.session.activeOrganizationId;

  if (!activeOrganizationId) {
    return { workspaceId: personalUserId, canManage: true };
  }

  const alias = await ctx.db
    .query("workspaceAliases")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", activeOrganizationId),
    )
    .unique();

  const activeRole = await auth.api.getActiveMemberRole({ headers });
  const roles = String(activeRole.role)
    .split(",")
    .map((role: string) => role.trim());
  return {
    workspaceId: alias?.workspaceId ?? `organization:${activeOrganizationId}`,
    canManage: roles.includes("owner") || roles.includes("admin"),
  };
}
