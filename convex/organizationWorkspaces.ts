import { v } from "convex/values";
import { authComponent, createAuth } from "./auth";
import { mutation } from "./_generated/server";

export const attachPersonalWorkspace = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const session = await auth.api.getSession({ headers });
    const organizationId = session?.session.activeOrganizationId;
    if (!organizationId) throw new Error("No active workspace");

    const role = await auth.api.getActiveMemberRole({ headers });
    const roles = String(role.role)
      .split(",")
      .map((value) => value.trim());
    if (!roles.includes("owner")) {
      throw new Error("Only the workspace owner can attach personal content");
    }

    const existing = await ctx.db
      .query("workspaceAliases")
      .withIndex("by_organization", (query) =>
        query.eq("organizationId", organizationId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("workspaceAliases", {
        organizationId,
        workspaceId: identity.subject,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
