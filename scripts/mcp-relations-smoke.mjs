import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
if (!endpoint) {
  throw new Error("Set NEXFIY_MCP_TEST_URL to a Nexfiy MCP environment URL");
}

const client = new Client({
  name: "nexfiy-relations-smoke",
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

async function expectToolError(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (!result.isError) {
    throw new Error(`${name} unexpectedly accepted invalid input`);
  }
}

const record = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return structured content`);
  }
  return value;
};

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const tools = await client.listTools();
  for (const required of [
    "add_database_property",
    "update_database_property",
    "set_database_value",
    "set_database_relation",
    "get_database",
  ]) {
    if (!tools.tools.some((tool) => tool.name === required)) {
      throw new Error(`MCP server is missing ${required}`);
    }
  }

  const root = record(
    await callTool("create_document", {
      title: "Relations Lab — MCP Live Test",
      icon: "🔗",
      contentModel: "page_blocks",
    }),
    "create root",
  ).document;
  const projects = record(
    await callTool("create_database", {
      title: "Projects",
      parentDocument: root.id,
    }),
    "create Projects",
  ).database;
  const teams = record(
    await callTool("create_database", {
      title: "Teams",
      parentDocument: root.id,
    }),
    "create Teams",
  ).database;

  const projectRows = [];
  for (const title of ["Project Atlas", "Project Beacon", "Project Cedar"]) {
    const result = record(
      await callTool("add_database_row", {
        dataSourceId: projects.dataSourceId,
        title,
      }),
      `create ${title}`,
    );
    projectRows.push({ id: result.documentId, title });
  }
  const teamRows = [];
  for (const title of ["Product", "Platform", "Growth"]) {
    const result = record(
      await callTool("add_database_row", {
        dataSourceId: teams.dataSourceId,
        title,
      }),
      `create ${title}`,
    );
    teamRows.push({ id: result.documentId, title });
  }

  const relation = record(
    await callTool("add_database_property", {
      dataSourceId: projects.dataSourceId,
      name: "Teams",
      type: "relation",
      relationDataSourceId: teams.dataSourceId,
      reciprocalName: "Projects",
    }),
    "create relation property",
  ).property;
  const capacity = record(
    await callTool("add_database_property", {
      dataSourceId: teams.dataSourceId,
      name: "Capacity",
      type: "number",
    }),
    "create capacity property",
  ).property;
  await expectToolError("add_database_property", {
    dataSourceId: teams.dataSourceId,
    name: "Invalid reciprocal number",
    type: "number",
    reciprocalName: "Should fail",
  });
  for (const [index, capacityValue] of [10, 20, 15].entries()) {
    await callTool("set_database_value", {
      documentId: teamRows[index].id,
      propertyId: capacity.propertyId,
      numberValue: capacityValue,
    });
  }
  await callTool("set_database_relation", {
    documentId: projectRows[0].id,
    propertyId: relation.propertyId,
    targetDocumentIds: [teamRows[0].id, teamRows[1].id],
  });
  await callTool("set_database_relation", {
    documentId: projectRows[1].id,
    propertyId: relation.propertyId,
    targetDocumentIds: [teamRows[2].id],
  });
  await callTool("set_database_relation", {
    documentId: projectRows[2].id,
    propertyId: relation.propertyId,
    targetDocumentIds: [teamRows[0].id],
  });
  if (!relation.reciprocalPropertyId) {
    throw new Error("Relation creation did not return a reciprocal property");
  }
  await callTool("set_database_relation", {
    documentId: teamRows[2].id,
    propertyId: relation.reciprocalPropertyId,
    targetDocumentIds: [projectRows[1].id, projectRows[2].id],
  });
  await callTool("set_database_relation", {
    documentId: teamRows[2].id,
    propertyId: relation.reciprocalPropertyId,
    targetDocumentIds: [projectRows[2].id],
  });
  const rollup = record(
    await callTool("add_database_property", {
      dataSourceId: projects.dataSourceId,
      name: "Team capacity",
      type: "rollup",
      rollupRelationPropertyId: relation.propertyId,
      rollupTargetPropertyId: capacity.propertyId,
      rollupFunction: "sum",
    }),
    "create capacity rollup",
  ).property;
  const formula = record(
    await callTool("add_database_property", {
      dataSourceId: projects.dataSourceId,
      name: "Capacity with buffer",
      type: "formula",
      formulaExpression: 'round(prop("Team capacity") * 1.2, 1)',
    }),
    "create capacity formula",
  ).property;
  const formulaScore = record(
    await callTool("add_database_property", {
      dataSourceId: projects.dataSourceId,
      name: "Capacity tier",
      type: "formula",
      formulaExpression:
        'if(prop("Capacity with buffer") >= 20, "High", "Standard")',
    }),
    "create capacity tier formula",
  ).property;
  await callTool("update_database_property", {
    propertyId: rollup.propertyId,
    name: "Available capacity",
  });
  await callTool("update_database_property", {
    propertyId: formula.propertyId,
    name: "Capacity with margin",
    formulaExpression: 'round(prop("Available capacity") * 1.5, 1)',
  });
  await expectToolError("update_database_property", {
    propertyId: formula.propertyId,
    formulaExpression: "globalThis.process.exit()",
  });
  await expectToolError("add_database_property", {
    dataSourceId: projects.dataSourceId,
    name: "Unsafe formula",
    type: "formula",
    formulaExpression: "globalThis.process.exit()",
  });

  await callTool("create_page_blocks", {
    pageId: root.id,
    blocks: [
      {
        key: "title",
        type: "heading_1",
        text: "Projects connected to teams",
      },
      {
        key: "intro",
        type: "callout",
        text: "These relation edges, rollups, and safe formulas were created and verified through MCP.",
        color: "blue",
      },
      {
        key: "projects-heading",
        type: "heading_2",
        text: "Projects",
      },
      {
        key: "projects",
        type: "database_view",
        dataSourceId: projects.dataSourceId,
        viewId: projects.viewId,
      },
      {
        key: "teams-heading",
        type: "heading_2",
        text: "Teams",
      },
      {
        key: "teams",
        type: "database_view",
        dataSourceId: teams.dataSourceId,
        viewId: teams.viewId,
      },
    ],
  });

  const summary = record(
    await callTool("get_database", { documentId: projects.documentId }),
    "read Projects",
  ).database;
  const teamsSummary = record(
    await callTool("get_database", { documentId: teams.documentId }),
    "read Teams",
  ).database;
  const relationProperty = summary.properties.find(
    (property) => property.id === relation.propertyId,
  );
  const atlasRelation = summary.rows
    .find((row) => row.id === projectRows[0].id)
    ?.values.find((value) => value.propertyId === relation.propertyId);
  const beaconRelation = summary.rows
    .find((row) => row.id === projectRows[1].id)
    ?.values.find((value) => value.propertyId === relation.propertyId);
  const relationOptions = summary.relationOptions.find(
    (option) => option.propertyId === relation.propertyId,
  );
  const reciprocalProperty = teamsSummary.properties.find(
    (property) => property.id === relation.reciprocalPropertyId,
  );
  const reciprocalValues = teamRows.map((team) =>
    teamsSummary.rows
      .find((row) => row.id === team.id)
      ?.values.find(
        (value) => value.propertyId === relation.reciprocalPropertyId,
      ),
  );
  const rollupProperty = summary.properties.find(
    (property) => property.id === rollup.propertyId,
  );
  const rollupValues = projectRows.map((project) =>
    summary.rows
      .find((row) => row.id === project.id)
      ?.values.find((value) => value.propertyId === rollup.propertyId),
  );
  const formulaProperty = summary.properties.find(
    (property) => property.id === formula.propertyId,
  );
  const formulaValues = projectRows.map((project) =>
    summary.rows
      .find((row) => row.id === project.id)
      ?.values.find((value) => value.propertyId === formula.propertyId),
  );
  const scoreValues = projectRows.map((project) =>
    summary.rows
      .find((row) => row.id === project.id)
      ?.values.find((value) => value.propertyId === formulaScore.propertyId),
  );
  const scoreProperty = summary.properties.find(
    (property) => property.id === formulaScore.propertyId,
  );
  if (
    relationProperty?.relationDataSourceId !== teams.dataSourceId ||
    relationProperty?.reciprocalPropertyId !== relation.reciprocalPropertyId ||
    reciprocalProperty?.relationDataSourceId !== projects.dataSourceId ||
    reciprocalProperty?.reciprocalPropertyId !== relation.propertyId ||
    atlasRelation?.relationDocumentIds?.length !== 2 ||
    beaconRelation?.relationDocumentIds?.length !== 0 ||
    relationOptions?.rows.length !== 3 ||
    rollupProperty?.rollupFunction !== "sum" ||
    rollupProperty?.rollupRelationPropertyId !== relation.propertyId ||
    rollupProperty?.rollupTargetPropertyId !== capacity.propertyId ||
    rollupValues[0]?.numberValue !== 30 ||
    rollupValues[1]?.numberValue !== undefined ||
    reciprocalValues[0]?.relationDocumentIds?.length !== 2 ||
    reciprocalValues[1]?.relationDocumentIds?.length !== 1 ||
    reciprocalValues[2]?.relationDocumentIds?.length !== 1 ||
    rollupValues[2]?.numberValue !== 25 ||
    formulaProperty?.formulaVersion !== 1 ||
    formulaProperty?.name !== "Capacity with margin" ||
    !formulaProperty?.formulaExpression?.includes("Available capacity") ||
    formulaProperty?.formulaDependencyPropertyIds?.[0] !== rollup.propertyId ||
    scoreProperty?.formulaDependencyPropertyIds?.[0] !== formula.propertyId ||
    !scoreProperty?.formulaExpression?.includes("Capacity with margin") ||
    formulaValues[0]?.numberValue !== 45 ||
    formulaValues[1]?.numberValue !== undefined ||
    formulaValues[2]?.numberValue !== 37.5 ||
    scoreValues[0]?.textValue !== "High" ||
    scoreValues[1]?.textValue !== "Standard" ||
    scoreValues[2]?.textValue !== "High"
  ) {
    throw new Error(
      `Relation or rollup snapshot did not match the written data: ${JSON.stringify(
        {
          atlas: atlasRelation?.relationDocumentIds,
          beacon: beaconRelation?.relationDocumentIds,
          reciprocal: reciprocalValues.map(
            (value) => value?.relationDocumentIds,
          ),
          rollups: rollupValues.map((value) => value?.numberValue),
          formulas: formulaValues.map((value) => value?.numberValue),
          tiers: scoreValues.map((value) => value?.textValue),
        },
      )}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        connectedToolCount: tools.tools.length,
        rootPageId: root.id,
        projectsDocumentId: projects.documentId,
        teamsDocumentId: teams.documentId,
        relationPropertyId: relation.propertyId,
        reciprocalPropertyId: relation.reciprocalPropertyId,
        rollupPropertyId: rollup.propertyId,
        capacityPropertyId: capacity.propertyId,
        formulaPropertyId: formula.propertyId,
        formulaScorePropertyId: formulaScore.propertyId,
        projectCount: projectRows.length,
        teamCount: teamRows.length,
        verifiedAtlasRelations: atlasRelation.relationDocumentIds.length,
        verifiedBeaconRelations: beaconRelation.relationDocumentIds.length,
        availableRelationTargets: relationOptions.rows.length,
        verifiedReciprocalCounts: reciprocalValues.map(
          (value) => value.relationDocumentIds.length,
        ),
        verifiedRollupValues: rollupValues.map((value) => value.numberValue),
        verifiedFormulaValues: formulaValues.map((value) => value.numberValue),
        verifiedFormulaTiers: scoreValues.map((value) => value.textValue),
        rejectedUnsafeFormula: true,
        rejectedUnsafeFormulaEdit: true,
        renameSafeFormulaDependencies: true,
        rejectedInvalidReciprocalConfiguration: true,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
