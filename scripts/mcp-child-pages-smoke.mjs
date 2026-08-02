import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
if (!endpoint) {
  throw new Error("Set NEXFIY_MCP_TEST_URL to a Nexfiy MCP environment URL");
}

const client = new Client({
  name: "nexfiy-child-pages-smoke",
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
  if (!tools.tools.some((tool) => tool.name === "create_child_page")) {
    throw new Error("MCP server is missing create_child_page");
  }

  const suffix = Date.now().toString(36);
  const firstParent = (
    await callTool("create_document", {
      title: `Child page source ${suffix}`,
      icon: "📁",
      contentModel: "page_blocks",
    })
  ).document;
  const secondParent = (
    await callTool("create_document", {
      title: `Child page destination ${suffix}`,
      icon: "📂",
      contentModel: "page_blocks",
    })
  ).document;
  const operationId = `child-page-${suffix}`;
  const created = (
    await callTool("create_child_page", {
      pageId: firstParent.id,
      title: "Launch plan",
      operationId,
    })
  ).childPage;
  const replay = (
    await callTool("create_child_page", {
      pageId: firstParent.id,
      title: "Ignored replay title",
      operationId,
    })
  ).childPage;
  if (
    replay.blockId !== created.blockId ||
    replay.pageId !== created.pageId
  ) {
    throw new Error("Child-page replay created a duplicate result");
  }

  const sourceBlocks = (
    await callTool("list_page_blocks", { pageId: firstParent.id })
  ).blocks;
  const childLink = sourceBlocks.find(
    (block) =>
      block.id === created.blockId &&
      block.type === "child_page" &&
      block.linkedPageId === created.pageId,
  );
  if (!childLink) {
    throw new Error("Parent canvas is missing its linked child-page block");
  }
  const childBlocks = (
    await callTool("list_page_blocks", { pageId: created.pageId })
  ).blocks;
  if (
    childBlocks.length !== 1 ||
    childBlocks[0].type !== "paragraph" ||
    childBlocks[0].text !== ""
  ) {
    throw new Error("New child page is missing its initial editable paragraph");
  }

  await callTool("move_page_block", {
    blockId: created.blockId,
    targetPageId: secondParent.id,
    placement: "after",
  });
  const movedPage = (
    await callTool("get_document", { documentId: created.pageId })
  ).document;
  const destinationBlocks = (
    await callTool("list_page_blocks", { pageId: secondParent.id })
  ).blocks;
  if (
    movedPage.parentId !== secondParent.id ||
    !destinationBlocks.some((block) => block.id === created.blockId)
  ) {
    throw new Error("Moving the sub-page block did not reparent the page tree");
  }

  console.log(
    JSON.stringify(
      {
        connectedToolCount: tools.tools.length,
        firstParentId: firstParent.id,
        secondParentId: secondParent.id,
        childPageId: created.pageId,
        childBlockId: created.blockId,
        replayReturnedSameResult: true,
        initialEditableBlock: true,
        movedPageParentId: movedPage.parentId,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
