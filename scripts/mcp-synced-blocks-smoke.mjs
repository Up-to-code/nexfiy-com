import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
if (!endpoint) {
  throw new Error("Set NEXFIY_MCP_TEST_URL to a Nexfiy MCP environment URL");
}

const client = new Client({
  name: "nexfiy-synced-blocks-smoke",
  version: "1.0.0",
});

function errorText(result) {
  return (
    result.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n") || "Unknown MCP error"
  );
}

async function callTool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name} failed: ${errorText(result)}`);
  return result.structuredContent ?? {};
}

async function expectToolError(name, args, expectedCode) {
  const result = await client.callTool({ name, arguments: args });
  if (!result.isError) {
    throw new Error(`${name} unexpectedly succeeded`);
  }
  const message = errorText(result);
  if (!message.includes(expectedCode)) {
    throw new Error(`${name} failed without ${expectedCode}: ${message}`);
  }
  return expectedCode;
}

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const tools = await client.listTools();
  for (const required of [
    "get_synced_block",
    "create_synced_reference",
    "unlink_synced_reference",
  ]) {
    if (!tools.tools.some((tool) => tool.name === required)) {
      throw new Error(`MCP server is missing ${required}`);
    }
  }

  const suffix = Date.now().toString(36);
  const documents = (
    await callTool("create_workspace", {
      pages: [
        {
          key: "source",
          title: `Synced source ${suffix}`,
          icon: "🔄",
          contentModel: "page_blocks",
        },
        {
          key: "live",
          title: `Live reference ${suffix}`,
          icon: "📡",
          contentModel: "page_blocks",
        },
        {
          key: "unlinked",
          title: `Unlinked copy ${suffix}`,
          icon: "📄",
          contentModel: "page_blocks",
        },
      ],
    })
  ).documents;
  const byKey = new Map(documents.map((document) => [document.key, document]));
  const sourcePage = byKey.get("source");
  const livePage = byKey.get("live");
  const unlinkedPage = byKey.get("unlinked");
  if (!sourcePage || !livePage || !unlinkedPage) {
    throw new Error("Workspace creation did not return all test pages");
  }

  const created = (
    await callTool("create_page_blocks", {
      pageId: sourcePage.id,
      blocks: [
        {
          key: "source-root",
          type: "callout",
          text: "Canonical launch status",
          color: "blue",
        },
        {
          key: "source-heading",
          parentKey: "source-root",
          type: "heading_2",
          text: "Launch readiness",
        },
        {
          key: "source-check",
          parentKey: "source-root",
          type: "checklist",
          text: "Initial synced value",
          checked: false,
        },
        {
          key: "cycle-probe",
          type: "paragraph",
          text: "Cycle probe",
        },
      ],
    })
  ).blocks;
  const sourceRoot = created.find((block) => block.key === "source-root");
  const sourceChecklist = created.find(
    (block) => block.key === "source-check",
  );
  const cycleProbe = created.find((block) => block.key === "cycle-probe");
  if (!sourceRoot || !sourceChecklist || !cycleProbe) {
    throw new Error("Source block creation did not return expected keys");
  }

  const liveReference = (
    await callTool("create_synced_reference", {
      sourceBlockId: sourceRoot.id,
      targetPageId: livePage.id,
    })
  ).syncedReference;
  const unlinkReference = (
    await callTool("create_synced_reference", {
      sourceBlockId: sourceRoot.id,
      targetPageId: unlinkedPage.id,
    })
  ).syncedReference;
  if (
    !liveReference?.referenceBlockId ||
    liveReference.groupId !== unlinkReference?.groupId
  ) {
    throw new Error("References did not reuse one canonical sync group");
  }

  const firstUpdate = `Live MCP update ${suffix}`;
  await callTool("update_page_block", {
    blockId: sourceChecklist.id,
    text: firstUpdate,
    checked: true,
  });
  for (const referenceBlockId of [
    liveReference.referenceBlockId,
    unlinkReference.referenceBlockId,
  ]) {
    const syncedBlock = (
      await callTool("get_synced_block", { referenceBlockId })
    ).syncedBlock;
    const checklist = syncedBlock.blocks.find(
      (block) => block.id === sourceChecklist.id,
    );
    if (checklist?.text !== firstUpdate || checklist.checked !== true) {
      throw new Error("Canonical source update did not reach every reference");
    }
  }

  const rejectedCycle = await expectToolError(
    "create_synced_reference",
    {
      sourceBlockId: cycleProbe.id,
      targetPageId: sourcePage.id,
      parentBlockId: sourceRoot.id,
    },
    "SYNC_CYCLE",
  );
  const rejectedMoveCycle = await expectToolError(
    "move_page_block",
    {
      blockId: liveReference.referenceBlockId,
      targetPageId: sourcePage.id,
      targetBlockId: sourceRoot.id,
      placement: "inside",
    },
    "SYNC_CYCLE",
  );

  const unlinked = (
    await callTool("unlink_synced_reference", {
      referenceBlockId: unlinkReference.referenceBlockId,
    })
  ).unlinked;
  if (unlinked.blockIds.length !== 3) {
    throw new Error(`Expected 3 cloned blocks, got ${unlinked.blockIds.length}`);
  }

  const secondUpdate = `Source moved on ${suffix}`;
  await callTool("update_page_block", {
    blockId: sourceChecklist.id,
    text: secondUpdate,
    checked: false,
  });
  const liveAfterUnlink = (
    await callTool("get_synced_block", {
      referenceBlockId: liveReference.referenceBlockId,
    })
  ).syncedBlock;
  if (
    !liveAfterUnlink.blocks.some(
      (block) =>
        block.id === sourceChecklist.id &&
        block.text === secondUpdate &&
        block.checked === false,
    )
  ) {
    throw new Error("Remaining live reference stopped following the source");
  }

  const independentBlocks = (
    await callTool("list_page_blocks", { pageId: unlinkedPage.id })
  ).blocks;
  if (
    independentBlocks.some((block) => block.type === "synced_reference") ||
    !independentBlocks.some((block) => block.text === firstUpdate) ||
    independentBlocks.some((block) => block.text === secondUpdate)
  ) {
    throw new Error("Unlinked blocks did not remain an independent snapshot");
  }

  console.log(
    JSON.stringify(
      {
        connectedToolCount: tools.tools.length,
        sourcePageId: sourcePage.id,
        livePageId: livePage.id,
        independentPageId: unlinkedPage.id,
        syncGroupId: liveReference.groupId,
        liveReferenceBlockId: liveReference.referenceBlockId,
        canonicalBlockCount: liveAfterUnlink.blocks.length,
        independentBlockCount: independentBlocks.length,
        rejectedCycle,
        rejectedMoveCycle,
        verifiedPropagation: true,
        verifiedUnlinkIsolation: true,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
