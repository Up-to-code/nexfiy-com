import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PageBlockType } from "@/convex/lib/pageWriteDomain";
import { hashAccessToken } from "@/lib/access-token";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path?: string[] }> };
type JsonObject = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

type PageModel = "blocknote" | "page_blocks";

async function dispatchAction(
  client: ConvexHttpClient,
  action: string,
  tokenHash: string,
  payload: JsonObject,
) {
  switch (action) {
    case "list_pages":
      return client.query(api.webhooks.listDocuments, { tokenHash });

    case "get_page":
      return client.query(api.webhooks.getDocument, {
        tokenHash,
        documentId: payload.documentId as Id<"documents">,
      });

    case "create_page":
      return client.mutation(api.webhooks.createDocument, {
        tokenHash,
        title: payload.title as string,
        parentId: payload.parentId as Id<"documents"> | undefined,
        content: payload.content as string | undefined,
        icon: payload.icon as string | undefined,
        cover: payload.cover as string | undefined,
        isPublished: payload.isPublished as boolean | undefined,
        contentModel: payload.contentModel as PageModel | undefined,
      });

    case "update_page":
      return client.mutation(api.webhooks.updateDocument, {
        tokenHash,
        documentId: payload.documentId as Id<"documents">,
        title: payload.title as string | undefined,
        content: payload.content as string | undefined,
        icon: payload.icon as string | undefined,
        cover: payload.cover as string | undefined,
        isPublished: payload.isPublished as boolean | undefined,
      });

    case "delete_page":
      return client.mutation(api.webhooks.archiveDocument, {
        tokenHash,
        documentId: payload.documentId as Id<"documents">,
      });

    case "create_blocks":
      return client.mutation(api.webhooks.createBlocks, {
        tokenHash,
        pageId: payload.pageId as Id<"documents">,
        blocks: payload.blocks as {
          key: string;
          parentKey?: string;
          type: PageBlockType;
          text?: string;
          checked?: boolean;
          url?: string;
          alt?: string;
          caption?: string;
          color?: string;
          propsJson?: string;
          dataSourceId?: Id<"dataSources">;
          viewId?: Id<"databaseViews">;
        }[],
      });

    case "update_block":
      return client.mutation(api.webhooks.updateBlock, {
        tokenHash,
        blockId: payload.blockId as Id<"pageBlocks">,
        text: payload.text as string | undefined,
        checked: payload.checked as boolean | undefined,
        url: payload.url as string | undefined,
        alt: payload.alt as string | undefined,
        caption: payload.caption as string | undefined,
        color: payload.color as string | undefined,
      });

    case "move_block":
      return client.mutation(api.webhooks.moveBlock, {
        tokenHash,
        blockId: payload.blockId as Id<"pageBlocks">,
        targetPageId: payload.targetPageId as Id<"documents">,
        targetBlockId: payload.targetBlockId as Id<"pageBlocks"> | undefined,
        placement: payload.placement as "before" | "after" | "inside",
      });

    default:
      return undefined;
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const token = path[0] ?? bearerToken(request);
  if (!token) return json({ error: "Missing webhook token" }, 401);

  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!deploymentUrl) {
    return json({ error: "Webhooks are not configured" }, 503);
  }

  const body = (await request.json().catch(() => null)) as JsonObject | null;
  if (!body || typeof body.action !== "string") {
    return json({ error: "Body must include an action" }, 400);
  }

  const tokenHash = await hashAccessToken(token);
  const client = new ConvexHttpClient(deploymentUrl);
  const { action, ...payload } = body;

  try {
    const result = await dispatchAction(client, action, tokenHash, payload);
    if (result === undefined) {
      return json({ error: `Unknown action "${action}"` }, 400);
    }
    return json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const paymentRequired = /PAYMENT_REQUIRED/i.test(message);
    const unauthorized = /UNAUTHORIZED|unavailable|INVALID_TOKEN/i.test(message);
    const forbidden = /FORBIDDEN/i.test(message);
    const notFound = /NOT_FOUND/i.test(message);
    return json(
      {
        error: paymentRequired
          ? "Nexfiy Pro is required for webhook access"
          : unauthorized
            ? "Invalid or disabled webhook token"
            : forbidden
              ? "This webhook key does not have permission for that action"
              : notFound
                ? "Page or block not found"
                : "Request failed",
        code: paymentRequired
          ? "PAYMENT_REQUIRED"
          : unauthorized
            ? "UNAUTHORIZED"
            : forbidden
              ? "FORBIDDEN"
              : notFound
                ? "NOT_FOUND"
                : undefined,
      },
      paymentRequired ? 402 : unauthorized ? 401 : forbidden ? 403 : notFound ? 404 : 400,
    );
  }
}
