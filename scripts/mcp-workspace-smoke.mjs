import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
if (!endpoint) {
  throw new Error("Set NEXFIY_MCP_TEST_URL to a Nexfiy MCP environment URL");
}

const client = new Client({
  name: "nexfiy-workspace-smoke",
  version: "1.0.0",
});

async function callTool(name, args) {
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

const asRecord = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return structured content`);
  }
  return value;
};

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const tools = await client.listTools();
  const requiredTools = [
    "create_workspace",
    "create_database",
    "add_database_property",
    "create_database_view",
    "add_database_row",
    "set_database_value",
    "create_page_blocks",
    "move_page_block",
    "list_page_blocks",
  ];
  for (const toolName of requiredTools) {
    if (!tools.tools.some((tool) => tool.name === toolName)) {
      throw new Error(`MCP server is missing ${toolName}`);
    }
  }

  const workspaceResult = asRecord(
    await callTool("create_workspace", {
      pages: [
        {
          key: "root",
          title: "Atlas Product Studio — MCP Live Test",
          icon: "🚀",
          contentModel: "page_blocks",
        },
        {
          key: "roadmap",
          parentKey: "root",
          title: "Product roadmap",
          icon: "🗺️",
          contentModel: "page_blocks",
        },
        {
          key: "specs",
          parentKey: "root",
          title: "Specs and decisions",
          icon: "🧭",
          contentModel: "page_blocks",
        },
        {
          key: "launches",
          parentKey: "root",
          title: "Launch calendar",
          icon: "📆",
          contentModel: "page_blocks",
        },
      ],
    }),
    "create_workspace",
  );
  const pages = workspaceResult.documents;
  const pageByKey = Object.fromEntries(pages.map((page) => [page.key, page]));

  const databaseResult = asRecord(
    await callTool("create_database", {
      title: "Product delivery",
      parentDocument: pageByKey.root.id,
    }),
    "create_database",
  ).database;

  const priority = asRecord(
    await callTool("add_database_property", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Priority",
      type: "select",
      options: [
        { name: "Critical", color: "red" },
        { name: "High", color: "orange" },
        { name: "Medium", color: "blue" },
        { name: "Low", color: "slate" },
      ],
    }),
    "add Priority",
  ).property;
  const owner = asRecord(
    await callTool("add_database_property", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Owner",
      type: "text",
    }),
    "add Owner",
  ).property;
  const dueDate = asRecord(
    await callTool("add_database_property", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Due date",
      type: "date",
    }),
    "add Due date",
  ).property;
  const effort = asRecord(
    await callTool("add_database_property", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Effort",
      type: "number",
    }),
    "add Effort",
  ).property;
  const ready = asRecord(
    await callTool("add_database_property", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Ready",
      type: "checkbox",
    }),
    "add Ready",
  ).property;

  const pipelineViewId = asRecord(
    await callTool("create_database_view", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Delivery pipeline",
      type: "board",
      groupPropertyId: databaseResult.statusPropertyId,
    }),
    "create pipeline",
  ).viewId;
  const calendarViewId = asRecord(
    await callTool("create_database_view", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Launch calendar",
      type: "calendar",
      datePropertyId: dueDate.propertyId,
    }),
    "create calendar",
  ).viewId;
  const timelineViewId = asRecord(
    await callTool("create_database_view", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Delivery timeline",
      type: "timeline",
      datePropertyId: dueDate.propertyId,
    }),
    "create timeline",
  ).viewId;
  const focusViewId = asRecord(
    await callTool("create_database_view", {
      dataSourceId: databaseResult.dataSourceId,
      name: "Critical focus",
      type: "table",
      filters: [
        {
          propertyId: priority.propertyId,
          operator: "equals",
          value: priority.optionIds[0],
        },
      ],
      sorts: [{ propertyId: dueDate.propertyId, direction: "asc" }],
    }),
    "create critical view",
  ).viewId;

  const rowBlueprints = [
    {
      title: "Ship collaborative comments",
      status: 1,
      priority: 0,
      owner: "Maya",
      due: Date.UTC(2026, 7, 7),
      effort: 8,
      ready: true,
    },
    {
      title: "Launch mobile capture",
      status: 0,
      priority: 1,
      owner: "Omar",
      due: Date.UTC(2026, 7, 12),
      effort: 13,
      ready: false,
    },
    {
      title: "Validate enterprise SSO",
      status: 1,
      priority: 0,
      owner: "Nora",
      due: Date.UTC(2026, 7, 16),
      effort: 5,
      ready: true,
    },
    {
      title: "Publish template gallery",
      status: 2,
      priority: 2,
      owner: "Leo",
      due: Date.UTC(2026, 7, 3),
      effort: 3,
      ready: true,
    },
    {
      title: "Research offline mode",
      status: 0,
      priority: 3,
      owner: "Aya",
      due: Date.UTC(2026, 7, 24),
      effort: 21,
      ready: false,
    },
  ];
  const rows = [];
  for (const blueprint of rowBlueprints) {
    const rowId = asRecord(
      await callTool("add_database_row", {
        dataSourceId: databaseResult.dataSourceId,
        title: blueprint.title,
      }),
      `add row ${blueprint.title}`,
    ).documentId;
    await Promise.all([
      callTool("set_database_value", {
        documentId: rowId,
        propertyId: databaseResult.statusPropertyId,
        optionIds: [databaseResult.statusOptionIds[blueprint.status]],
      }),
      callTool("set_database_value", {
        documentId: rowId,
        propertyId: priority.propertyId,
        optionIds: [priority.optionIds[blueprint.priority]],
      }),
      callTool("set_database_value", {
        documentId: rowId,
        propertyId: owner.propertyId,
        textValue: blueprint.owner,
      }),
      callTool("set_database_value", {
        documentId: rowId,
        propertyId: dueDate.propertyId,
        dateStart: blueprint.due,
      }),
      callTool("set_database_value", {
        documentId: rowId,
        propertyId: effort.propertyId,
        numberValue: blueprint.effort,
      }),
      callTool("set_database_value", {
        documentId: rowId,
        propertyId: ready.propertyId,
        booleanValue: blueprint.ready,
      }),
    ]);
    rows.push({ id: rowId, title: blueprint.title });
  }

  const rootBlocks = asRecord(
    await callTool("create_page_blocks", {
      pageId: pageByKey.root.id,
      blocks: [
        {
          key: "hero",
          type: "heading_1",
          text: "Atlas Product Studio",
        },
        {
          key: "intro",
          type: "callout",
          text: "Live operating system created entirely through Nexfiy MCP",
          color: "blue",
        },
        {
          key: "intro-body",
          parentKey: "intro",
          type: "paragraph",
          text: "Plan delivery, track decisions, and coordinate launches from one realtime workspace.",
        },
        { key: "cols", type: "columns" },
        {
          key: "left",
          parentKey: "cols",
          type: "column",
          propsJson: JSON.stringify({ width: 0.5 }),
        },
        {
          key: "left-heading",
          parentKey: "left",
          type: "heading_2",
          text: "This week",
        },
        {
          key: "movable-task",
          parentKey: "left",
          type: "checklist",
          text: "Review launch readiness with every owner",
          checked: false,
        },
        {
          key: "right",
          parentKey: "cols",
          type: "column",
          propsJson: JSON.stringify({ width: 0.5 }),
        },
        {
          key: "right-heading",
          parentKey: "right",
          type: "heading_2",
          text: "North star",
        },
        {
          key: "north-star",
          parentKey: "right",
          type: "quote",
          text: "Every plan stays connected to the work that proves it.",
        },
        {
          key: "pipeline-heading",
          type: "heading_2",
          text: "Delivery pipeline",
        },
        {
          key: "pipeline",
          type: "database_view",
          dataSourceId: databaseResult.dataSourceId,
          viewId: pipelineViewId,
        },
      ],
    }),
    "create root blocks",
  ).blocks;

  await callTool("create_page_blocks", {
    pageId: pageByKey.roadmap.id,
    blocks: [
      {
        key: "title",
        type: "heading_1",
        text: "Product roadmap",
      },
      {
        key: "body",
        type: "paragraph",
        text: "Dates are shared with the pipeline and update in realtime.",
      },
      {
        key: "calendar",
        type: "database_view",
        dataSourceId: databaseResult.dataSourceId,
        viewId: calendarViewId,
      },
      {
        key: "focus",
        type: "database_view",
        dataSourceId: databaseResult.dataSourceId,
        viewId: focusViewId,
      },
    ],
  });
  const specBlocks = asRecord(
    await callTool("create_page_blocks", {
      pageId: pageByKey.specs.id,
      blocks: [
        {
          key: "title",
          type: "heading_1",
          text: "Specs and decisions",
        },
        {
          key: "decision",
          type: "toggle",
          text: "Decision log",
        },
        {
          key: "decision-body",
          parentKey: "decision",
          type: "paragraph",
          text: "Keep tradeoffs close to the work and move blocks here as decisions mature.",
        },
      ],
    }),
    "create spec blocks",
  ).blocks;
  await callTool("create_page_blocks", {
    pageId: pageByKey.launches.id,
    blocks: [
      {
        key: "title",
        type: "heading_1",
        text: "Launch calendar",
      },
      {
        key: "timeline",
        type: "database_view",
        dataSourceId: databaseResult.dataSourceId,
        viewId: timelineViewId,
      },
    ],
  });

  const movableTask = rootBlocks.find((block) => block.key === "movable-task");
  const decisionToggle = specBlocks.find((block) => block.key === "decision");
  await callTool("move_page_block", {
    blockId: movableTask.id,
    targetPageId: pageByKey.specs.id,
    targetBlockId: decisionToggle.id,
    placement: "inside",
  });
  await callTool("update_page_block", {
    blockId: movableTask.id,
    text: "Review launch readiness with every owner — moved here through MCP",
  });

  const [rootBlockSummary, specBlockSummary, databaseSummary] =
    await Promise.all([
      callTool("list_page_blocks", { pageId: pageByKey.root.id }),
      callTool("list_page_blocks", { pageId: pageByKey.specs.id }),
      callTool("get_database", { documentId: databaseResult.documentId }),
    ]);

  console.log(
    JSON.stringify(
      {
        connectedToolCount: tools.tools.length,
        rootPageId: pageByKey.root.id,
        childPageIds: {
          roadmap: pageByKey.roadmap.id,
          specs: pageByKey.specs.id,
          launches: pageByKey.launches.id,
        },
        databaseDocumentId: databaseResult.documentId,
        dataSourceId: databaseResult.dataSourceId,
        createdRows: rows.length,
        createdViews: 5,
        rootBlockCount: rootBlockSummary.blocks.length,
        specBlockCount: specBlockSummary.blocks.length,
        verifiedDatabaseRows: databaseSummary.database.rows.length,
        verifiedDatabaseViews: databaseSummary.database.views.length,
        movedBlockId: movableTask.id,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
