import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
if (!endpoint) {
  throw new Error("Set NEXFIY_MCP_TEST_URL to a Nexfiy MCP environment URL");
}

const client = new Client({
  name: "nexfiy-block-editing-smoke",
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
  if (!tools.tools.some((tool) => tool.name === "split_page_block")) {
    throw new Error("MCP server is missing split_page_block");
  }

  const suffix = Date.now().toString(36);
  const document = (
    await callTool("create_document", {
      title: `Block editing ${suffix}`,
      icon: "⌨️",
      contentModel: "page_blocks",
    })
  ).document;
  const created = (
    await callTool("create_page_blocks", {
      pageId: document.id,
      blocks: [
        { key: "text", type: "paragraph", text: "BeforeAfter" },
        {
          key: "checklist",
          type: "checklist",
          text: "FirstSecond",
          checked: true,
        },
        { key: "heading", type: "heading_1", text: "" },
      ],
    })
  ).blocks;
  const byKey = new Map(created.map((block) => [block.key, block]));
  const textBlock = byKey.get("text");
  const checklistBlock = byKey.get("checklist");
  const headingBlock = byKey.get("heading");
  if (!textBlock || !checklistBlock || !headingBlock) {
    throw new Error("Block blueprint did not return every test block");
  }

  const textOperationId = `text-${suffix}`;
  const firstSplit = (
    await callTool("split_page_block", {
      blockId: textBlock.id,
      text: "BeforeAfter",
      cursorOffset: 6,
      operationId: textOperationId,
    })
  ).split;
  const replayedSplit = (
    await callTool("split_page_block", {
      blockId: textBlock.id,
      text: "BeforeAfter",
      cursorOffset: 6,
      operationId: textOperationId,
    })
  ).split;
  if (
    firstSplit.action !== "split" ||
    replayedSplit.focusBlockId !== firstSplit.focusBlockId
  ) {
    throw new Error("Replayed split did not return its original result");
  }

  const checklistSplit = (
    await callTool("split_page_block", {
      blockId: checklistBlock.id,
      text: "FirstSecond",
      cursorOffset: 5,
      operationId: `checklist-${suffix}`,
    })
  ).split;
  const normalizedHeading = (
    await callTool("split_page_block", {
      blockId: headingBlock.id,
      text: "",
      cursorOffset: 0,
      operationId: `heading-${suffix}`,
    })
  ).split;
  if (
    checklistSplit.action !== "split" ||
    normalizedHeading.action !== "normalized" ||
    normalizedHeading.focusBlockId !== headingBlock.id
  ) {
    throw new Error("List continuation or heading normalization failed");
  }

  const blocks = (
    await callTool("list_page_blocks", { pageId: document.id })
  ).blocks;
  const textValues = blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text);
  const checklists = blocks.filter((block) => block.type === "checklist");
  if (
    blocks.length !== 5 ||
    !textValues.includes("Before") ||
    !textValues.includes("After") ||
    checklists.length !== 2 ||
    checklists[0].text !== "First" ||
    checklists[1].text !== "Second" ||
    checklists[1].checked !== false ||
    blocks.some((block) => block.type === "heading_1")
  ) {
    throw new Error("Final normalized block state is incorrect");
  }

  console.log(
    JSON.stringify(
      {
        connectedToolCount: tools.tools.length,
        documentId: document.id,
        finalBlockCount: blocks.length,
        idempotentFocusBlockId: firstSplit.focusBlockId,
        replayReturnedSameResult: true,
        checklistContinuation: checklists.map((block) => ({
          text: block.text,
          checked: block.checked,
        })),
        normalizedHeading: true,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
