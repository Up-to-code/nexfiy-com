import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { hashAccessToken } from "@/lib/access-token";

export type ContentRouteContext = { params: Promise<{ path?: string[] }> };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function contentApiOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function contentApiGet(
  request: Request,
  context: ContentRouteContext,
) {
  const token = bearerToken(request);
  if (!token) return json({ error: "Missing bearer token" }, 401);

  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!deploymentUrl) {
    return json({ error: "Content API is not configured" }, 503);
  }

  const tokenHash = await hashAccessToken(token);
  const { path = [] } = await context.params;
  const client = new ConvexHttpClient(deploymentUrl);

  try {
    if (path.length === 0) {
      const sources = await client.query(api.contentApi.listSources, {
        tokenHash,
      });
      return json({
        data: sources,
        meta: { count: sources.length },
      });
    }

    if (path.length === 1) {
      const url = new URL(request.url);
      const requestedLimit = Number(url.searchParams.get("limit") ?? 25);
      const numItems = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(Math.floor(requestedLimit), 100))
        : 25;
      const cursor = url.searchParams.get("cursor");
      const result = await client.query(api.contentApi.getContent, {
        tokenHash,
        dataSourceId: path[0] as Id<"dataSources">,
        paginationOpts: { numItems, cursor },
      });
      if (!result) return json({ error: "Database not found" }, 404);
      return json({
        data: {
          source: result.source,
          schema: result.properties,
          items: result.items.page,
        },
        meta: {
          isDone: result.items.isDone,
          nextCursor: result.items.isDone ? null : result.items.continueCursor,
        },
      });
    }

    if (path.length === 2) {
      const result = await client.query(api.contentApi.getContentItem, {
        tokenHash,
        dataSourceId: path[0] as Id<"dataSources">,
        contentId: path[1] as Id<"documents">,
      });
      return result
        ? json({ data: result })
        : json({ error: "Content item not found" }, 404);
    }

    return json({ error: "Route not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const paymentRequired = /PAYMENT_REQUIRED/i.test(message);
    const unauthorized = /UNAUTHORIZED|unavailable|INVALID_TOKEN/i.test(
      message,
    );
    return json(
      {
        error: paymentRequired
          ? "Nexfiy Pro is required for Content API access"
          : unauthorized
            ? "Invalid or disabled API key"
            : "Request failed",
        code: paymentRequired ? "PAYMENT_REQUIRED" : undefined,
      },
      paymentRequired ? 402 : unauthorized ? 401 : 400,
    );
  }
}
