import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ConvexHttpClient } from "convex/browser";
import path from "node:path";
import sharp from "sharp";
import { UTApi, UTFile } from "uploadthing/server";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { hashMcpToken } from "@/lib/mcp-token";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

const pageBlockTypeSchema = z.enum([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list",
  "numbered_list",
  "checklist",
  "quote",
  "callout",
  "toggle",
  "divider",
  "image",
  "file",
  "bookmark",
  "database_view",
  "columns",
  "column",
  "synced_reference",
]);

const databasePropertyTypeSchema = z.enum([
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "checkbox",
  "url",
  "relation",
  "rollup",
  "formula",
]);

const rollupFunctionSchema = z.enum([
  "count",
  "count_values",
  "sum",
  "average",
  "min",
  "max",
]);

const databaseViewTypeSchema = z.enum([
  "table",
  "board",
  "calendar",
  "timeline",
]);

const databaseFilterSchema = z.object({
  propertyId: z.string().min(1),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "is_empty",
    "is_not_empty",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const databaseSortSchema = z.object({
  propertyId: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

const MAX_MCP_IMAGE_BYTES = 3 * 1024 * 1024;

async function uploadMcpImage(
  dataBase64: string,
  fileName: string,
  workspaceId: string,
) {
  const source = Buffer.from(dataBase64, "base64");
  if (!source.length || source.length > MAX_MCP_IMAGE_BYTES) {
    throw new Error("Image must decode to between 1 byte and 3 MB");
  }
  const image = sharp(source, { failOn: "error" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("The uploaded data is not a supported image");
  }
  const output = await image
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86 })
    .toBuffer();
  const baseName = path.basename(fileName, path.extname(fileName)).slice(0, 80);
  const customId = `${workspaceId}--${crypto.randomUUID()}`;
  const uploaded = await new UTApi().uploadFiles(
    new UTFile([output], `${baseName || "image"}.webp`, {
      type: "image/webp",
      customId,
    }),
  );
  if (uploaded.error) throw new Error(uploaded.error.message);
  const url = new URL(uploaded.data.ufsUrl);
  url.pathname = `/f/${encodeURIComponent(customId)}`;
  return {
    url: url.toString(),
    width: metadata.width,
    height: metadata.height,
    size: output.length,
    mimeType: "image/webp",
  };
}

function jsonRpcError(status: number, message: string) {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: status === 401 ? -32001 : -32603, message },
      id: null,
    },
    { status, headers: corsHeaders },
  );
}

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([name, value]) =>
    headers.set(name, value),
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleMcpRequest(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 32 || token.length > 256) {
    return jsonRpcError(401, "Invalid MCP environment URL");
  }

  const tokenHash = await hashMcpToken(token);
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
    logger: false,
  });
  let access;
  try {
    access = await convex.query(api.mcpEnvironments.getAccess, { tokenHash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP unavailable";
    if (/PAYMENT_REQUIRED/i.test(message)) {
      return jsonRpcError(402, "Nexfiy Pro is required for MCP access");
    }
    return jsonRpcError(401, "MCP environment is disabled or unavailable");
  }
  if (!access) {
    return jsonRpcError(401, "MCP environment is disabled or unavailable");
  }

  const server = new McpServer({
    name: `Nexfiy — ${access.environmentName}`,
    version: "1.0.0",
    websiteUrl: new URL(request.url).origin,
  });

  server.registerTool(
    "upload_image",
    {
      title: "Upload an image to Nexfiy",
      description:
        "Upload base64 image data into workspace-owned Nexfiy storage. Optionally append the uploaded asset as a normalized image block on a dynamic page. Use the returned URL for covers, database properties, or later image blocks.",
      inputSchema: {
        dataBase64: z.string().min(1).max(4_200_000),
        fileName: z.string().min(1).max(120),
        altText: z.string().max(500).optional(),
        pageId: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ dataBase64, fileName, altText, pageId }) => {
      const image = await uploadMcpImage(
        dataBase64,
        fileName,
        access.workspaceId,
      );
      const blocks = pageId
        ? await convex.mutation(api.mcpEnvironments.createPageBlocks, {
            tokenHash,
            pageId: pageId as Id<"documents">,
            blocks: [
              {
                key: `uploaded-image-${crypto.randomUUID()}`,
                type: "image",
                text: altText,
                url: image.url,
              },
            ],
          })
        : [];
      return {
        content: [
          {
            type: "text" as const,
            text: pageId
              ? `Image uploaded and appended to the page.\n${image.url}`
              : `Image uploaded.\n${image.url}`,
          },
        ],
        structuredContent: { image, block: blocks[0] ?? null },
      };
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "List Nexfiy documents",
      description:
        "List recent, non-archived documents in this Nexfiy workspace.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ limit }) => {
      const documents = await convex.query(api.mcpEnvironments.listDocuments, {
        tokenHash,
        limit,
      });
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(documents, null, 2) },
        ],
        structuredContent: { documents },
      };
    },
  );

  server.registerTool(
    "search_documents",
    {
      title: "Search Nexfiy documents",
      description: "Search document titles in this Nexfiy workspace.",
      inputSchema: {
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ query, limit }) => {
      const documents = await convex.query(
        api.mcpEnvironments.searchDocuments,
        { tokenHash, search: query, limit },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(documents, null, 2) },
        ],
        structuredContent: { documents },
      };
    },
  );

  server.registerTool(
    "get_document",
    {
      title: "Read a Nexfiy document",
      description:
        "Read one non-archived document by the id returned from a list or search.",
      inputSchema: {
        documentId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ documentId }) => {
      const document = await convex.query(api.mcpEnvironments.getDocument, {
        tokenHash,
        documentId: documentId as Id<"documents">,
      });
      if (!document) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Document not found in this MCP environment.",
            },
          ],
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(document, null, 2) },
        ],
        structuredContent: { document },
      };
    },
  );

  server.registerTool(
    "create_document",
    {
      title: "Create a Nexfiy document",
      description:
        "Create a document in this workspace, optionally nested below another document.",
      inputSchema: {
        title: z.string().min(1).max(200),
        parentId: z.string().optional(),
        content: z.string().max(100_000).optional(),
        icon: z.string().max(20).optional(),
        isPublished: z.boolean().optional(),
        contentModel: z.enum(["blocknote", "page_blocks"]).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, parentId, content, icon, isPublished, contentModel }) => {
      const document = await convex.mutation(
        api.mcpEnvironments.createDocument,
        {
          tokenHash,
          title,
          parentId: parentId as Id<"documents"> | undefined,
          content,
          icon,
          isPublished,
          contentModel,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(document, null, 2) },
        ],
        structuredContent: { document },
      };
    },
  );

  server.registerTool(
    "list_page_templates",
    {
      title: "List Nexfiy page templates",
      description:
        "List reusable templates saved in this workspace, including their nested page and block counts.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      const templates = await convex.query(
        api.mcpEnvironments.listPageTemplatesForMcp,
        { tokenHash },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(templates, null, 2) },
        ],
        structuredContent: { templates },
      };
    },
  );

  server.registerTool(
    "save_page_as_template",
    {
      title: "Save a Nexfiy page tree as a template",
      description:
        "Snapshot one dynamic page, its nested dynamic subpages, and every normalized block as a reusable workspace template.",
      inputSchema: {
        sourcePageId: z.string().min(1),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ sourcePageId, name, description }) => {
      const templateId = await convex.mutation(
        api.mcpEnvironments.createPageTemplateForMcp,
        {
          tokenHash,
          sourcePageId: sourcePageId as Id<"documents">,
          name,
          description,
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ templateId }, null, 2),
          },
        ],
        structuredContent: { templateId },
      };
    },
  );

  server.registerTool(
    "instantiate_page_template",
    {
      title: "Create pages from a Nexfiy template",
      description:
        "Atomically create fresh documents and blocks from a saved template, optionally nested beneath an existing page and with a custom root title.",
      inputSchema: {
        templateId: z.string().min(1),
        parentDocument: z.string().min(1).optional(),
        title: z.string().min(1).max(200).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ templateId, parentDocument, title }) => {
      const created = await convex.mutation(
        api.mcpEnvironments.instantiatePageTemplateForMcp,
        {
          tokenHash,
          templateId: templateId as Id<"pageTemplates">,
          parentDocument: parentDocument as Id<"documents"> | undefined,
          title,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(created, null, 2) },
        ],
        structuredContent: { created },
      };
    },
  );

  server.registerTool(
    "create_workspace",
    {
      title: "Build a Nexfiy workspace",
      description:
        "Atomically create a hierarchy of up to 50 Nexfiy pages. Each parentKey must refer to a page key that appears earlier in the array.",
      inputSchema: {
        pages: z
          .array(
            z.object({
              key: z.string().min(1).max(80),
              parentKey: z.string().min(1).max(80).optional(),
              title: z.string().min(1).max(200),
              content: z.string().max(100_000).optional(),
              icon: z.string().max(20).optional(),
              isPublished: z.boolean().optional(),
              contentModel: z.enum(["blocknote", "page_blocks"]).optional(),
            }),
          )
          .min(1)
          .max(50),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ pages }) => {
      const documents = await convex.mutation(
        api.mcpEnvironments.createWorkspace,
        { tokenHash, pages },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Created ${documents.length} pages.\n${JSON.stringify(documents, null, 2)}`,
          },
        ],
        structuredContent: { documents },
      };
    },
  );

  server.registerTool(
    "list_page_blocks",
    {
      title: "List dynamic page blocks",
      description:
        "Read every normalized block on a page created with the page_blocks content model, including nesting and saved database view references.",
      inputSchema: { pageId: z.string().min(1) },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ pageId }) => {
      const blocks = await convex.query(api.mcpEnvironments.listPageBlocks, {
        tokenHash,
        pageId: pageId as Id<"documents">,
      });
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(blocks, null, 2) },
        ],
        structuredContent: { blocks },
      };
    },
  );

  server.registerTool(
    "create_child_page",
    {
      title: "Create a nested Nexfiy page",
      description:
        "Atomically create a real page beneath a dynamic parent page and place its navigable sub-page block in the parent canvas. Reusing operationId returns the original page.",
      inputSchema: {
        pageId: z.string().min(1),
        title: z.string().max(200).optional(),
        parentBlockId: z.string().min(1).optional(),
        afterBlockId: z.string().min(1).optional(),
        replaceBlockId: z.string().min(1).optional(),
        operationId: z.string().min(1).max(100),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      pageId,
      title,
      parentBlockId,
      afterBlockId,
      replaceBlockId,
      operationId,
    }) => {
      const childPage = await convex.mutation(
        api.mcpEnvironments.createChildPageBlockForMcp,
        {
          tokenHash,
          pageId: pageId as Id<"documents">,
          title,
          parentBlockId: parentBlockId as Id<"pageBlocks"> | undefined,
          afterBlockId: afterBlockId as Id<"pageBlocks"> | undefined,
          replaceBlockId: replaceBlockId as Id<"pageBlocks"> | undefined,
          operationId,
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(childPage, null, 2),
          },
        ],
        structuredContent: { childPage },
      };
    },
  );

  server.registerTool(
    "create_page_blocks",
    {
      title: "Build dynamic page blocks",
      description:
        "Atomically append up to 250 normalized blocks to a dynamic page. Keys are local to this call; parentKey must reference an earlier container block. Use database_view with matching dataSourceId and viewId to embed a saved database view.",
      inputSchema: {
        pageId: z.string().min(1),
        blocks: z
          .array(
            z.object({
              key: z.string().min(1).max(80),
              parentKey: z.string().min(1).max(80).optional(),
              type: pageBlockTypeSchema,
              text: z.string().max(50_000).optional(),
              checked: z.boolean().optional(),
              url: z.string().max(5_000).optional(),
              color: z.string().max(50).optional(),
              propsJson: z.string().max(20_000).optional(),
              dataSourceId: z.string().min(1).optional(),
              viewId: z.string().min(1).optional(),
            }),
          )
          .min(1)
          .max(250),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ pageId, blocks }) => {
      const created = await convex.mutation(
        api.mcpEnvironments.createPageBlocks,
        {
          tokenHash,
          pageId: pageId as Id<"documents">,
          blocks: blocks.map((block) => ({
            ...block,
            dataSourceId: block.dataSourceId as Id<"dataSources"> | undefined,
            viewId: block.viewId as Id<"databaseViews"> | undefined,
          })),
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Created ${created.length} blocks.\n${JSON.stringify(created, null, 2)}`,
          },
        ],
        structuredContent: { blocks: created },
      };
    },
  );

  server.registerTool(
    "get_synced_block",
    {
      title: "Read canonical synced block content",
      description:
        "Resolve a synced reference to its canonical source subtree and return the current realtime block content.",
      inputSchema: { referenceBlockId: z.string().min(1) },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ referenceBlockId }) => {
      const syncedBlock = await convex.query(
        api.mcpEnvironments.getSyncedBlockForMcp,
        {
          tokenHash,
          referenceBlockId: referenceBlockId as Id<"pageBlocks">,
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(syncedBlock, null, 2),
          },
        ],
        structuredContent: { syncedBlock },
      };
    },
  );

  server.registerTool(
    "create_synced_reference",
    {
      title: "Create a synced block reference",
      description:
        "Create or reuse a canonical sync group for one source block subtree and append a live reference on another dynamic page.",
      inputSchema: {
        sourceBlockId: z.string().min(1),
        targetPageId: z.string().min(1),
        parentBlockId: z.string().min(1).optional(),
        afterBlockId: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ sourceBlockId, targetPageId, parentBlockId, afterBlockId }) => {
      const syncedReference = await convex.mutation(
        api.mcpEnvironments.createSyncedReferenceForMcp,
        {
          tokenHash,
          sourceBlockId: sourceBlockId as Id<"pageBlocks">,
          targetPageId: targetPageId as Id<"documents">,
          parentBlockId: parentBlockId as Id<"pageBlocks"> | undefined,
          afterBlockId: afterBlockId as Id<"pageBlocks"> | undefined,
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(syncedReference, null, 2),
          },
        ],
        structuredContent: { syncedReference },
      };
    },
  );

  server.registerTool(
    "unlink_synced_reference",
    {
      title: "Unlink a synced block reference",
      description:
        "Replace one live synced reference with fresh independent blocks copied from the canonical source at its current state.",
      inputSchema: { referenceBlockId: z.string().min(1) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ referenceBlockId }) => {
      const unlinked = await convex.mutation(
        api.mcpEnvironments.unlinkSyncedReferenceForMcp,
        {
          tokenHash,
          referenceBlockId: referenceBlockId as Id<"pageBlocks">,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(unlinked, null, 2) },
        ],
        structuredContent: { unlinked },
      };
    },
  );

  server.registerTool(
    "update_page_block",
    {
      title: "Update a dynamic page block",
      description:
        "Update editable content and presentation properties on one normalized page block.",
      inputSchema: {
        blockId: z.string().min(1),
        text: z.string().max(50_000).optional(),
        checked: z.boolean().optional(),
        url: z.string().max(5_000).optional(),
        color: z.string().max(50).optional(),
        propsJson: z.string().max(20_000).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ blockId, text, checked, url, color, propsJson }) => {
      await convex.mutation(api.mcpEnvironments.updatePageBlock, {
        tokenHash,
        blockId: blockId as Id<"pageBlocks">,
        text,
        checked,
        url,
        color,
        propsJson,
      });
      return {
        content: [{ type: "text" as const, text: "Block updated." }],
        structuredContent: { updated: true, blockId },
      };
    },
  );

  server.registerTool(
    "split_page_block",
    {
      title: "Split or normalize a dynamic page block",
      description:
        "Atomically split editable block text at a caret offset. Lists and checklists continue their type; other blocks continue as text. Reusing operationId safely returns the original result.",
      inputSchema: {
        blockId: z.string().min(1),
        text: z.string().max(50_000),
        cursorOffset: z.number().int().nonnegative(),
        operationId: z.string().min(1).max(100),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ blockId, text, cursorOffset, operationId }) => {
      const split = await convex.mutation(
        api.mcpEnvironments.splitPageBlockAtCaretForMcp,
        {
          tokenHash,
          blockId: blockId as Id<"pageBlocks">,
          text,
          cursorOffset,
          operationId,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(split, null, 2) },
        ],
        structuredContent: { split },
      };
    },
  );

  server.registerTool(
    "move_page_block",
    {
      title: "Move a dynamic page block",
      description:
        "Move a block before, after, or inside another block, including across dynamic pages. Child blocks move with their parent.",
      inputSchema: {
        blockId: z.string().min(1),
        targetPageId: z.string().min(1),
        targetBlockId: z.string().min(1).optional(),
        placement: z.enum(["before", "after", "inside"]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ blockId, targetPageId, targetBlockId, placement }) => {
      await convex.mutation(api.mcpEnvironments.movePageBlock, {
        tokenHash,
        blockId: blockId as Id<"pageBlocks">,
        targetPageId: targetPageId as Id<"documents">,
        targetBlockId: targetBlockId as Id<"pageBlocks"> | undefined,
        placement,
      });
      return {
        content: [{ type: "text" as const, text: "Block moved." }],
        structuredContent: { moved: true, blockId, targetPageId },
      };
    },
  );

  server.registerTool(
    "update_document",
    {
      title: "Update a Nexfiy document",
      description:
        "Update the title, content, icon, or publishing state of a document.",
      inputSchema: {
        documentId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        content: z.string().max(100_000).optional(),
        icon: z.string().max(20).optional(),
        isPublished: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ documentId, title, content, icon, isPublished }) => {
      const document = await convex.mutation(
        api.mcpEnvironments.updateDocument,
        {
          tokenHash,
          documentId: documentId as Id<"documents">,
          title,
          content,
          icon,
          isPublished,
        },
      );
      if (!document) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Document not found in this MCP environment.",
            },
          ],
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(document, null, 2) },
        ],
        structuredContent: { document },
      };
    },
  );

  server.registerTool(
    "create_database",
    {
      title: "Create a Nexfiy database",
      description:
        "Create a Notion-style database page with a data source, Name and Status properties, default status options, and a saved table view.",
      inputSchema: {
        title: z.string().min(1).max(200),
        parentDocument: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, parentDocument }) => {
      const database = await convex.mutation(
        api.mcpEnvironments.createDatabase,
        {
          tokenHash,
          title,
          parentDocument: parentDocument as Id<"documents"> | undefined,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(database, null, 2) },
        ],
        structuredContent: { database },
      };
    },
  );

  server.registerTool(
    "add_database_property",
    {
      title: "Add a database property",
      description:
        "Add a typed property to a Nexfiy database. Relations may create a named reciprocal property in the target database; select, multi-select, and status properties may define options in the same call.",
      inputSchema: {
        dataSourceId: z.string().min(1),
        name: z.string().min(1).max(100),
        type: databasePropertyTypeSchema,
        relationDataSourceId: z.string().min(1).optional(),
        reciprocalName: z.string().min(1).max(100).optional(),
        rollupRelationPropertyId: z.string().min(1).optional(),
        rollupTargetPropertyId: z.string().min(1).optional(),
        rollupFunction: rollupFunctionSchema.optional(),
        formulaExpression: z.string().min(1).max(2_000).optional(),
        options: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              color: z.string().min(1).max(30),
            }),
          )
          .max(100)
          .optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      dataSourceId,
      name,
      type,
      relationDataSourceId,
      reciprocalName,
      rollupRelationPropertyId,
      rollupTargetPropertyId,
      rollupFunction,
      formulaExpression,
      options,
    }) => {
      const property = await convex.mutation(
        api.mcpEnvironments.addDatabaseProperty,
        {
          tokenHash,
          dataSourceId: dataSourceId as Id<"dataSources">,
          name,
          type,
          relationDataSourceId: relationDataSourceId as
            Id<"dataSources"> | undefined,
          reciprocalName,
          rollupRelationPropertyId: rollupRelationPropertyId as
            Id<"databaseProperties"> | undefined,
          rollupTargetPropertyId: rollupTargetPropertyId as
            Id<"databaseProperties"> | undefined,
          rollupFunction,
          formulaExpression,
          options,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(property, null, 2) },
        ],
        structuredContent: { property },
      };
    },
  );

  server.registerTool(
    "create_database_view",
    {
      title: "Create a saved database view",
      description:
        "Create and configure a saved table, pipeline, calendar, or timeline view. Pipelines require a status/select group property; calendars and timelines require a date property. When omitted, a compatible property is selected automatically.",
      inputSchema: {
        dataSourceId: z.string().min(1),
        name: z.string().min(1).max(100),
        type: databaseViewTypeSchema,
        visiblePropertyIds: z.array(z.string().min(1)).max(100).optional(),
        sorts: z.array(databaseSortSchema).max(20).optional(),
        filters: z.array(databaseFilterSchema).max(20).optional(),
        groupPropertyId: z.string().min(1).optional(),
        datePropertyId: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      dataSourceId,
      name,
      type,
      visiblePropertyIds,
      sorts,
      filters,
      groupPropertyId,
      datePropertyId,
    }) => {
      const viewId = await convex.mutation(
        api.mcpEnvironments.createDatabaseView,
        {
          tokenHash,
          dataSourceId: dataSourceId as Id<"dataSources">,
          name,
          type,
          visiblePropertyIds: visiblePropertyIds as
            Id<"databaseProperties">[] | undefined,
          sorts: sorts?.map((sort) => ({
            ...sort,
            propertyId: sort.propertyId as Id<"databaseProperties">,
          })),
          filters: filters?.map((filter) => ({
            ...filter,
            propertyId: filter.propertyId as Id<"databaseProperties">,
          })),
          groupPropertyId: groupPropertyId as
            Id<"databaseProperties"> | undefined,
          datePropertyId: datePropertyId as
            Id<"databaseProperties"> | undefined,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ viewId }, null, 2) },
        ],
        structuredContent: { viewId },
      };
    },
  );

  server.registerTool(
    "configure_database_view",
    {
      title: "Configure a saved database view",
      description:
        "Update a saved view's name, visible properties, sorts, filters, grouping property, or date property.",
      inputSchema: {
        viewId: z.string().min(1),
        name: z.string().min(1).max(100).optional(),
        visiblePropertyIds: z.array(z.string().min(1)).max(100).optional(),
        sorts: z.array(databaseSortSchema).max(20).optional(),
        filters: z.array(databaseFilterSchema).max(20).optional(),
        groupPropertyId: z.string().min(1).optional(),
        datePropertyId: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      viewId,
      name,
      visiblePropertyIds,
      sorts,
      filters,
      groupPropertyId,
      datePropertyId,
    }) => {
      await convex.mutation(api.mcpEnvironments.configureDatabaseView, {
        tokenHash,
        viewId: viewId as Id<"databaseViews">,
        name,
        visiblePropertyIds: visiblePropertyIds as
          Id<"databaseProperties">[] | undefined,
        sorts: sorts?.map((sort) => ({
          ...sort,
          propertyId: sort.propertyId as Id<"databaseProperties">,
        })),
        filters: filters?.map((filter) => ({
          ...filter,
          propertyId: filter.propertyId as Id<"databaseProperties">,
        })),
        groupPropertyId: groupPropertyId as
          Id<"databaseProperties"> | undefined,
        datePropertyId: datePropertyId as Id<"databaseProperties"> | undefined,
      });
      return {
        content: [{ type: "text" as const, text: "Database view updated." }],
        structuredContent: { updated: true, viewId },
      };
    },
  );

  server.registerTool(
    "update_database_property",
    {
      title: "Update a database property",
      description:
        "Rename a property or safely recompile an existing formula without changing its stable property ID. Dependent formula display expressions follow property renames automatically.",
      inputSchema: {
        propertyId: z.string().min(1),
        name: z.string().min(1).max(100).optional(),
        formulaExpression: z.string().min(1).max(2_000).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ propertyId, name, formulaExpression }) => {
      const property = await convex.mutation(
        api.mcpEnvironments.updateDatabasePropertyForMcp,
        {
          tokenHash,
          propertyId: propertyId as Id<"databaseProperties">,
          name,
          formulaExpression,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(property, null, 2) },
        ],
        structuredContent: { property },
      };
    },
  );

  server.registerTool(
    "add_database_row",
    {
      title: "Add a page to a Nexfiy database",
      description:
        "Add a database row. The new row is also a full Nexfiy page with its own stable document ID and body.",
      inputSchema: {
        dataSourceId: z.string().min(1),
        title: z.string().min(1).max(200),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ dataSourceId, title }) => {
      const documentId = await convex.mutation(
        api.mcpEnvironments.addDatabaseRow,
        {
          tokenHash,
          dataSourceId: dataSourceId as Id<"dataSources">,
          title,
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ documentId }, null, 2),
          },
        ],
        structuredContent: { documentId },
      };
    },
  );

  server.registerTool(
    "get_database",
    {
      title: "Read a Nexfiy database",
      description:
        "Read a database schema, options, rows, and typed values by its database document ID.",
      inputSchema: { documentId: z.string().min(1) },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ documentId }) => {
      const database = await convex.query(
        api.mcpEnvironments.getDatabaseSummary,
        {
          tokenHash,
          documentId: documentId as Id<"documents">,
        },
      );
      if (!database) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Database not found in this MCP environment.",
            },
          ],
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(database, null, 2) },
        ],
        structuredContent: { database },
      };
    },
  );

  server.registerTool(
    "set_database_value",
    {
      title: "Set a Nexfiy database property value",
      description:
        "Set a typed property value on a database row. Use the matching value field for the property's type.",
      inputSchema: {
        documentId: z.string().min(1),
        propertyId: z.string().min(1),
        textValue: z.string().max(10_000).optional(),
        numberValue: z.number().optional(),
        booleanValue: z.boolean().optional(),
        dateStart: z.number().optional(),
        dateEnd: z.number().optional(),
        optionIds: z.array(z.string().min(1)).max(100).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      documentId,
      propertyId,
      textValue,
      numberValue,
      booleanValue,
      dateStart,
      dateEnd,
      optionIds,
    }) => {
      const valueId = await convex.mutation(
        api.mcpEnvironments.setDatabaseValue,
        {
          tokenHash,
          documentId: documentId as Id<"documents">,
          propertyId: propertyId as Id<"databaseProperties">,
          textValue,
          numberValue,
          booleanValue,
          dateStart,
          dateEnd,
          optionIds: optionIds as Id<"databaseSelectOptions">[] | undefined,
        },
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ valueId }, null, 2) },
        ],
        structuredContent: { valueId },
      };
    },
  );

  server.registerTool(
    "set_database_relation",
    {
      title: "Set a Nexfiy database relation",
      description:
        "Replace the related pages for one relation property on a database row. Every target must be a row in the relation property's configured target database.",
      inputSchema: {
        documentId: z.string().min(1),
        propertyId: z.string().min(1),
        targetDocumentIds: z.array(z.string().min(1)).max(100),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ documentId, propertyId, targetDocumentIds }) => {
      await convex.mutation(api.mcpEnvironments.setDatabaseRelation, {
        tokenHash,
        documentId: documentId as Id<"documents">,
        propertyId: propertyId as Id<"databaseProperties">,
        targetDocumentIds: targetDocumentIds as Id<"documents">[],
      });
      return {
        content: [{ type: "text" as const, text: "Relation updated." }],
        structuredContent: {
          updated: true,
          documentId,
          propertyId,
          targetDocumentIds,
        },
      };
    },
  );

  server.registerTool(
    "archive_document",
    {
      title: "Archive a Nexfiy document",
      description: "Move one document to the workspace trash.",
      inputSchema: { documentId: z.string().min(1) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ documentId }) => {
      const archived = await convex.mutation(
        api.mcpEnvironments.archiveDocument,
        { tokenHash, documentId: documentId as Id<"documents"> },
      );
      return {
        isError: !archived,
        content: [
          {
            type: "text" as const,
            text: archived
              ? "Document archived."
              : "Document not found in this MCP environment.",
          },
        ],
        structuredContent: { archived },
      };
    },
  );

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    const metadataRequest = request.clone();
    await server.connect(transport);
    const response = await transport.handleRequest(request);

    if (request.method === "POST") {
      const body = await metadataRequest.json().catch(() => null);
      const clientName =
        body &&
        typeof body === "object" &&
        "params" in body &&
        body.params &&
        typeof body.params === "object" &&
        "clientInfo" in body.params &&
        body.params.clientInfo &&
        typeof body.params.clientInfo === "object" &&
        "name" in body.params.clientInfo &&
        typeof body.params.clientInfo.name === "string"
          ? body.params.clientInfo.name
          : undefined;
      if (clientName) {
        await convex.mutation(api.mcpEnvironments.recordConnection, {
          tokenHash,
          clientName,
        });
      }
    }

    return withCors(response);
  } catch (error) {
    return jsonRpcError(
      500,
      error instanceof Error ? error.message : "MCP request failed",
    );
  } finally {
    await server.close().catch(() => undefined);
  }
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
