import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
if (!endpoint) {
  throw new Error("Set NEXFIY_MCP_TEST_URL to a Nexfiy MCP environment URL");
}

const client = new Client({
  name: "nexfiy-templates-smoke",
  version: "1.0.0",
});

async function callTool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    const message = result.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
    throw new Error(`${name} failed: ${message || "Unknown MCP error"}`);
  }
  return result.structuredContent ?? {};
}

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const tools = await client.listTools();
  for (const required of [
    "list_page_templates",
    "save_page_as_template",
    "instantiate_page_template",
  ]) {
    if (!tools.tools.some((tool) => tool.name === required)) {
      throw new Error(`MCP server is missing ${required}`);
    }
  }

  const suffix = Date.now().toString(36);
  const source = (
    await callTool("create_workspace", {
      pages: [
        {
          key: "root",
          title: `Template Source ${suffix}`,
          icon: "🧩",
          contentModel: "page_blocks",
        },
        {
          key: "brief",
          parentKey: "root",
          title: "Project brief",
          icon: "📝",
          contentModel: "page_blocks",
        },
        {
          key: "launch",
          parentKey: "root",
          title: "Launch plan",
          icon: "🚀",
          contentModel: "page_blocks",
        },
      ],
    })
  ).documents;
  const sourceByKey = new Map(source.map((page) => [page.key, page]));
  const rootSource = sourceByKey.get("root");
  const briefSource = sourceByKey.get("brief");
  const launchSource = sourceByKey.get("launch");
  if (!rootSource || !briefSource || !launchSource) {
    throw new Error("Workspace blueprint did not return every source page");
  }

  const sourceBlockIds = [];
  const rootBlocks = await callTool("create_page_blocks", {
    pageId: rootSource.id,
    blocks: [
      { key: "title", type: "heading_1", text: "Reusable project system" },
      { key: "columns", type: "columns" },
      { key: "left", parentKey: "columns", type: "column" },
      {
        key: "goal",
        parentKey: "left",
        type: "checklist",
        text: "Define the project outcome",
        checked: false,
      },
      { key: "right", parentKey: "columns", type: "column" },
      {
        key: "note",
        parentKey: "right",
        type: "callout",
        text: "Keep decisions connected to delivery.",
        color: "blue",
      },
    ],
  });
  sourceBlockIds.push(...rootBlocks.blocks.map((block) => block.id));
  const briefBlocks = await callTool("create_page_blocks", {
    pageId: briefSource.id,
    blocks: [
      { key: "title", type: "heading_1", text: "Project brief" },
      { key: "context", type: "quote", text: "Why this project matters" },
    ],
  });
  sourceBlockIds.push(...briefBlocks.blocks.map((block) => block.id));
  const launchBlocks = await callTool("create_page_blocks", {
    pageId: launchSource.id,
    blocks: [
      { key: "title", type: "heading_1", text: "Launch plan" },
      {
        key: "ready",
        type: "checklist",
        text: "Confirm launch readiness",
        checked: false,
      },
    ],
  });
  sourceBlockIds.push(...launchBlocks.blocks.map((block) => block.id));
  const sourceChildPage = (
    await callTool("create_child_page", {
      pageId: rootSource.id,
      title: "Requirements",
      operationId: `template-child-${suffix}`,
    })
  ).childPage;
  sourceBlockIds.push(sourceChildPage.blockId);

  const templateName = `MCP project template ${suffix}`;
  const { templateId } = await callTool("save_page_as_template", {
    sourcePageId: rootSource.id,
    name: templateName,
    description: "Three-page project system created through MCP.",
  });
  const templates = (await callTool("list_page_templates")).templates;
  const template = templates.find((item) => item.id === templateId);
  if (
    !template ||
    template.name !== templateName ||
    template.pageCount !== 4 ||
    template.blockCount !== 12
  ) {
    throw new Error("Saved template summary does not match the source tree");
  }

  const destination = (
    await callTool("create_document", {
      title: `Template Destination ${suffix}`,
      icon: "📁",
      contentModel: "page_blocks",
    })
  ).document;
  const { created } = await callTool("instantiate_page_template", {
    templateId,
    parentDocument: destination.id,
    title: `Instantiated Project ${suffix}`,
  });
  if (
    created.documentIds.length !== 4 ||
    [...source.map((page) => page.id), sourceChildPage.pageId].some((pageId) =>
      created.documentIds.includes(pageId),
    )
  ) {
    throw new Error("Template did not create four fresh document IDs");
  }

  const documents = (await callTool("list_documents", { limit: 50 })).documents;
  const createdRoot = documents.find(
    (document) => document.id === created.rootDocumentId,
  );
  const createdChildren = documents.filter(
    (document) => document.parentId === created.rootDocumentId,
  );
  if (
    createdRoot?.parentId !== destination.id ||
    createdChildren.length !== 3 ||
    !createdChildren.some((document) => document.title === "Project brief") ||
    !createdChildren.some((document) => document.title === "Launch plan") ||
    !createdChildren.some((document) => document.title === "Requirements")
  ) {
    throw new Error("Instantiated template hierarchy is incorrect");
  }

  const blockCounts = [];
  const clonedBlockIds = [];
  const clonedChildPageBlocks = [];
  for (const documentId of created.documentIds) {
    const blocks = (await callTool("list_page_blocks", { pageId: documentId }))
      .blocks;
    blockCounts.push(blocks.length);
    clonedBlockIds.push(...blocks.map((block) => block.id));
    clonedChildPageBlocks.push(
      ...blocks.filter((block) => block.type === "child_page"),
    );
  }
  blockCounts.sort((left, right) => left - right);
  if (blockCounts.join(",") !== "1,2,2,7") {
    throw new Error(`Unexpected cloned block counts: ${blockCounts.join(",")}`);
  }
  if (clonedBlockIds.some((blockId) => sourceBlockIds.includes(blockId))) {
    throw new Error("Template reused a source block ID");
  }
  if (
    clonedChildPageBlocks.length !== 1 ||
    clonedChildPageBlocks[0].linkedPageId === sourceChildPage.pageId ||
    !created.documentIds.includes(clonedChildPageBlocks[0].linkedPageId)
  ) {
    throw new Error("Template did not remap the sub-page block to its cloned page");
  }

  console.log(
    JSON.stringify(
      {
        connectedToolCount: tools.tools.length,
        templateId,
        sourceRootId: rootSource.id,
        destinationId: destination.id,
        instantiatedRootId: created.rootDocumentId,
        freshDocumentCount: created.documentIds.length,
        clonedBlockCounts: blockCounts,
        freshBlockCount: clonedBlockIds.length,
        verifiedChildTitles: createdChildren.map((child) => child.title).sort(),
        remappedChildPageId: clonedChildPageBlocks[0].linkedPageId,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
