import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { getWorkspaceScope } from "./lib/workspace";

const failureValidator = v.object({
  blockId: v.id("pageBlocks"),
  reason: v.string(),
});

export const migrateLegacyBlocks = mutation({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    inspected: v.number(),
    migrated: v.number(),
    failures: v.array(failureValidator),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to migrate page content");
    const workspaceId = await getWorkspaceScope(ctx, identity.subject);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 200), 500));
    const candidates = await ctx.db
      .query("pageBlocks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(2_000);
    const legacy = candidates
      .filter((block) => block.type === "blocknote" && block.propsJson)
      .slice(0, limit + 1);
    const failures: Array<{
      blockId: (typeof legacy)[number]["_id"];
      reason: string;
    }> = [];
    let migrated = 0;

    for (const block of legacy.slice(0, limit)) {
      let stored: {
        type?: string;
        props?: Record<string, unknown>;
      };
      try {
        stored = JSON.parse(block.propsJson!) as typeof stored;
      } catch {
        failures.push({ blockId: block._id, reason: "Malformed propsJson" });
        continue;
      }
      const props = stored.props ?? {};
      if (stored.type === "linkCard") {
        const url = typeof props.url === "string" ? props.url.trim() : "";
        if (!url) {
          failures.push({ blockId: block._id, reason: "Link has no URL" });
          continue;
        }
        await ctx.db.patch(block._id, {
          type: "bookmark",
          text: typeof props.label === "string" ? props.label.trim() : url,
          url,
          propsJson: undefined,
          updatedAt: Date.now(),
        });
        migrated += 1;
        continue;
      }
      if (stored.type === "image") {
        const url = typeof props.url === "string" ? props.url.trim() : "";
        if (!url) {
          failures.push({ blockId: block._id, reason: "Image has no source" });
          continue;
        }
        await ctx.db.patch(block._id, {
          type: "image",
          alt: typeof props.alt === "string" ? props.alt : "",
          caption: typeof props.caption === "string" ? props.caption : "",
          url,
          propsJson: undefined,
          updatedAt: Date.now(),
        });
        migrated += 1;
        continue;
      }
      failures.push({
        blockId: block._id,
        reason: `Unsupported legacy block: ${stored.type ?? "unknown"}`,
      });
    }

    return {
      inspected: Math.min(legacy.length, limit),
      migrated,
      failures,
      hasMore: legacy.length > limit,
    };
  },
});
