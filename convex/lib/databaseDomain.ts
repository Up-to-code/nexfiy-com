import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { applyDatabaseView } from "./databaseViewEngine";
import {
  compileFormulaExpression,
  evaluateFormulaAst,
  formatFormulaExpressionFromAst,
  type FormulaRuntimeValue,
} from "./formulaEngine";

type ReadCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

export type EditablePropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "checkbox"
  | "url";

export type PropertyValueInput = {
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateStart?: number;
  dateEnd?: number;
  optionIds?: Id<"databaseSelectOptions">[];
};

export async function createReciprocalRelationProperty(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    primaryPropertyId: Id<"databaseProperties">;
    name: string;
  },
) {
  const primary = await requireDatabaseProperty(
    ctx,
    workspaceId,
    args.primaryPropertyId,
  );
  if (primary.type !== "relation" || !primary.relationDataSourceId) {
    throw databaseError(
      "INVALID_RELATION_PROPERTY",
      "Only a configured relation can create a reciprocal property",
    );
  }
  if (primary.reciprocalPropertyId) {
    const existing = await requireDatabaseProperty(
      ctx,
      workspaceId,
      primary.reciprocalPropertyId,
    );
    if (existing.reciprocalPropertyId !== primary._id) {
      throw databaseError(
        "INVALID_RECIPROCAL_RELATION",
        "The reciprocal relation pairing is inconsistent",
      );
    }
    return existing._id;
  }
  await requireDataSource(ctx, workspaceId, primary.relationDataSourceId);
  const name = args.name.trim();
  if (!name || name.length > 100) {
    throw databaseError(
      "INVALID_RECIPROCAL_NAME",
      "Reciprocal property name must contain 1 to 100 characters",
    );
  }
  const targetProperties = await ctx.db
    .query("databaseProperties")
    .withIndex("by_data_source", (q) =>
      q.eq("dataSourceId", primary.relationDataSourceId!),
    )
    .take(100);
  if (targetProperties.length >= 100) {
    throw databaseError(
      "PROPERTY_LIMIT",
      "The target database already has 100 properties",
    );
  }
  const now = Date.now();
  const reciprocalPropertyId = await ctx.db.insert("databaseProperties", {
    workspaceId,
    dataSourceId: primary.relationDataSourceId,
    name,
    type: "relation",
    relationDataSourceId: primary.dataSourceId,
    reciprocalPropertyId: primary._id,
    order: targetProperties.length,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(primary._id, {
    reciprocalPropertyId,
    updatedAt: now,
  });
  const targetViews = await ctx.db
    .query("databaseViews")
    .withIndex("by_data_source", (q) =>
      q.eq("dataSourceId", primary.relationDataSourceId!),
    )
    .take(50);
  await Promise.all(
    targetViews.map((view) =>
      ctx.db.patch(view._id, {
        visiblePropertyIds: [...view.visiblePropertyIds, reciprocalPropertyId],
        updatedAt: now,
      }),
    ),
  );
  return reciprocalPropertyId;
}

export async function updateDatabaseProperty(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    propertyId: Id<"databaseProperties">;
    name?: string;
    formulaExpression?: string;
  },
) {
  const property = await requireDatabaseProperty(
    ctx,
    workspaceId,
    args.propertyId,
  );
  if (args.name === undefined && args.formulaExpression === undefined) {
    throw databaseError(
      "PROPERTY_UPDATE_REQUIRED",
      "Choose a property setting to update",
    );
  }
  const properties = await ctx.db
    .query("databaseProperties")
    .withIndex("by_data_source", (q) =>
      q.eq("dataSourceId", property.dataSourceId),
    )
    .take(100);
  let nextName = property.name;
  if (args.name !== undefined) {
    nextName = args.name.trim();
    if (!nextName || nextName.length > 100) {
      throw databaseError(
        "INVALID_NAME",
        "Property name must contain 1 to 100 characters",
      );
    }
    if (
      properties.some(
        (candidate) =>
          candidate._id !== property._id &&
          candidate.name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
      )
    ) {
      throw databaseError(
        "DUPLICATE_PROPERTY_NAME",
        "Property names must be unique inside a database",
      );
    }
  }

  let compiledFormula: ReturnType<typeof compileFormulaExpression> | undefined;
  if (args.formulaExpression !== undefined) {
    if (property.type !== "formula") {
      throw databaseError(
        "INVALID_FORMULA_PROPERTY",
        "Only formula properties accept an expression",
      );
    }
    try {
      compiledFormula = compileFormulaExpression(
        args.formulaExpression,
        properties
          .filter((candidate) => candidate._id !== property._id)
          .map((candidate) => ({
            id: candidate._id,
            name: candidate.name,
          })),
      );
    } catch (error) {
      throw databaseError(
        "INVALID_FORMULA",
        error instanceof Error ? error.message : "Formula is invalid",
      );
    }
  }

  const now = Date.now();
  await ctx.db.patch(property._id, {
    ...(args.name !== undefined ? { name: nextName } : {}),
    ...(compiledFormula
      ? {
          formulaExpression: args.formulaExpression!.trim(),
          formulaVersion: compiledFormula.version,
          formulaAstJson: compiledFormula.astJson,
          formulaDependencyPropertyIds:
            compiledFormula.dependencyPropertyIds as Id<"databaseProperties">[],
        }
      : {}),
    updatedAt: now,
  });

  if (args.name !== undefined && nextName !== property.name) {
    const renamedProperties = properties.map((candidate) => ({
      id: candidate._id,
      name: candidate._id === property._id ? nextName : candidate.name,
    }));
    for (const dependent of properties) {
      if (
        dependent.type !== "formula" ||
        !dependent.formulaAstJson ||
        !dependent.formulaDependencyPropertyIds?.includes(property._id)
      ) {
        continue;
      }
      let displayExpression: string;
      try {
        displayExpression = formatFormulaExpressionFromAst(
          dependent.formulaAstJson,
          renamedProperties,
        );
      } catch (error) {
        throw databaseError(
          "INVALID_FORMULA",
          error instanceof Error
            ? error.message
            : "A dependent formula is invalid",
        );
      }
      await ctx.db.patch(dependent._id, {
        formulaExpression: displayExpression,
        updatedAt: now,
      });
    }
  }
  return {
    propertyId: property._id,
    name: nextName,
    formulaExpression:
      args.formulaExpression?.trim() ?? property.formulaExpression,
  };
}

export async function setDatabaseRelationTargets(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    documentId: Id<"documents">;
    propertyId: Id<"databaseProperties">;
    targetDocumentIds: Id<"documents">[];
  },
) {
  const row = await requireDatabaseRow(ctx, workspaceId, args.documentId);
  const property = await requireDatabaseProperty(
    ctx,
    workspaceId,
    args.propertyId,
  );
  if (
    property.type !== "relation" ||
    !property.relationDataSourceId ||
    property.dataSourceId !== row.dataSourceId
  ) {
    throw databaseError(
      "INVALID_RELATION_PROPERTY",
      "Relation property does not belong to this row's database",
    );
  }
  const targetDocumentIds = [...new Set(args.targetDocumentIds)];
  if (targetDocumentIds.length > 100) {
    throw databaseError(
      "RELATION_LIMIT",
      "A relation can reference up to 100 pages",
    );
  }
  for (const targetDocumentId of targetDocumentIds) {
    const target = await requireDatabaseRow(ctx, workspaceId, targetDocumentId);
    if (target.dataSourceId !== property.relationDataSourceId) {
      throw databaseError(
        "RELATION_TARGET_MISMATCH",
        "Relation target belongs to a different database",
      );
    }
  }
  const existing = await ctx.db
    .query("databaseRelations")
    .withIndex("by_source_document_and_property", (q) =>
      q.eq("sourceDocumentId", row._id).eq("propertyId", property._id),
    )
    .take(100);
  const reciprocal = property.reciprocalPropertyId
    ? await requireDatabaseProperty(
        ctx,
        workspaceId,
        property.reciprocalPropertyId,
      )
    : undefined;
  if (
    reciprocal &&
    (reciprocal.type !== "relation" ||
      reciprocal.reciprocalPropertyId !== property._id ||
      reciprocal.dataSourceId !== property.relationDataSourceId ||
      reciprocal.relationDataSourceId !== property.dataSourceId)
  ) {
    throw databaseError(
      "INVALID_RECIPROCAL_RELATION",
      "The reciprocal relation pairing is inconsistent",
    );
  }
  const requested = new Set<string>(targetDocumentIds);
  const removed = existing.filter(
    (relation) => !requested.has(relation.targetDocumentId),
  );
  for (const relation of removed) {
    await ctx.db.delete(relation._id);
    if (reciprocal) {
      const mirrors = await ctx.db
        .query("databaseRelations")
        .withIndex("by_source_document_and_property", (q) =>
          q
            .eq("sourceDocumentId", relation.targetDocumentId)
            .eq("propertyId", reciprocal._id),
        )
        .take(100);
      const mirror = mirrors.find(
        (candidate) => candidate.targetDocumentId === row._id,
      );
      if (mirror) await ctx.db.delete(mirror._id);
    }
  }
  const existingTargets = new Set(
    existing.map((relation) => relation.targetDocumentId as string),
  );
  const now = Date.now();
  for (const targetDocumentId of targetDocumentIds) {
    if (!existingTargets.has(targetDocumentId)) {
      await ctx.db.insert("databaseRelations", {
        workspaceId,
        dataSourceId: property.dataSourceId,
        sourceDocumentId: row._id,
        propertyId: property._id,
        targetDocumentId,
        createdAt: now,
      });
    }
    if (reciprocal) {
      const mirrors = await ctx.db
        .query("databaseRelations")
        .withIndex("by_source_document_and_property", (q) =>
          q
            .eq("sourceDocumentId", targetDocumentId)
            .eq("propertyId", reciprocal._id),
        )
        .take(100);
      if (
        !mirrors.some((candidate) => candidate.targetDocumentId === row._id)
      ) {
        await ctx.db.insert("databaseRelations", {
          workspaceId,
          dataSourceId: reciprocal.dataSourceId,
          sourceDocumentId: targetDocumentId,
          propertyId: reciprocal._id,
          targetDocumentId: row._id,
          createdAt: now,
        });
      }
    }
  }
}

export const databaseError = (code: string, message: string) =>
  new ConvexError({ code, message });

export async function requireDataSource(
  ctx: ReadCtx,
  workspaceId: string,
  dataSourceId: Id<"dataSources">,
) {
  const dataSource = await ctx.db.get(dataSourceId);
  if (!dataSource || dataSource.workspaceId !== workspaceId) {
    throw databaseError("DATA_SOURCE_NOT_FOUND", "Database not found");
  }
  return dataSource;
}

export async function requireDatabaseProperty(
  ctx: ReadCtx,
  workspaceId: string,
  propertyId: Id<"databaseProperties">,
) {
  const property = await ctx.db.get(propertyId);
  if (!property || property.workspaceId !== workspaceId) {
    throw databaseError("PROPERTY_NOT_FOUND", "Database property not found");
  }
  return property;
}

export async function requireDatabaseRow(
  ctx: ReadCtx,
  workspaceId: string,
  documentId: Id<"documents">,
) {
  const document = await ctx.db.get(documentId);
  if (
    !document ||
    document.userId !== workspaceId ||
    !document.dataSourceId ||
    document.isArchived
  ) {
    throw databaseError("ROW_NOT_FOUND", "Database row not found");
  }
  return document;
}

export async function syncDatabaseName(
  ctx: MutationCtx,
  workspaceId: string,
  document: Doc<"documents">,
  title: string,
) {
  if (document.kind !== "database") return;
  const dataSource = await ctx.db
    .query("dataSources")
    .withIndex("by_database_document", (q) =>
      q.eq("databaseDocumentId", document._id),
    )
    .unique();
  if (!dataSource || dataSource.workspaceId !== workspaceId) {
    throw databaseError(
      "DATA_SOURCE_NOT_FOUND",
      "The database data source is unavailable",
    );
  }
  await ctx.db.patch(dataSource._id, {
    name: title,
    updatedAt: Date.now(),
  });
}

function normalizePropertyValue(
  type: EditablePropertyType,
  input: PropertyValueInput,
): PropertyValueInput & { sortKey: string } {
  switch (type) {
    case "text":
    case "url": {
      const textValue = input.textValue?.slice(0, 10_000) ?? "";
      return { textValue, sortKey: textValue.toLocaleLowerCase() };
    }
    case "number": {
      const numberValue = input.numberValue;
      return {
        numberValue,
        sortKey:
          numberValue === undefined
            ? ""
            : `${numberValue < 0 ? "0" : "1"}:${Math.abs(numberValue)
                .toString()
                .padStart(24, "0")}`,
      };
    }
    case "checkbox": {
      const booleanValue = input.booleanValue ?? false;
      return { booleanValue, sortKey: booleanValue ? "1" : "0" };
    }
    case "date": {
      return {
        dateStart: input.dateStart,
        dateEnd: input.dateEnd,
        sortKey: input.dateStart?.toString().padStart(16, "0") ?? "",
      };
    }
    case "select":
    case "status":
    case "multi_select": {
      const optionIds = input.optionIds ?? [];
      return { optionIds, sortKey: optionIds.join(":") };
    }
  }
}

export async function createDatabase(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    title: string;
    parentDocument?: Id<"documents">;
  },
) {
  const title = args.title.trim();
  if (!title || title.length > 200) {
    throw databaseError("INVALID_TITLE", "Database title is required");
  }
  if (args.parentDocument) {
    const parent = await ctx.db.get(args.parentDocument);
    if (!parent || parent.userId !== workspaceId || parent.isArchived) {
      throw databaseError("INVALID_PARENT", "Parent page is unavailable");
    }
  }

  const now = Date.now();
  const documentId = await ctx.db.insert("documents", {
    title,
    userId: workspaceId,
    parentDocument: args.parentDocument,
    kind: "database",
    icon: "🗃️",
    fullWidth: true,
    showToc: false,
    isArchived: false,
    isPublished: false,
    updatedAt: now,
  });
  const dataSourceId = await ctx.db.insert("dataSources", {
    workspaceId,
    databaseDocumentId: documentId,
    name: title,
    createdAt: now,
    updatedAt: now,
  });
  const titlePropertyId = await ctx.db.insert("databaseProperties", {
    workspaceId,
    dataSourceId,
    name: "Name",
    type: "title",
    order: 0,
    createdAt: now,
    updatedAt: now,
  });
  const statusPropertyId = await ctx.db.insert("databaseProperties", {
    workspaceId,
    dataSourceId,
    name: "Status",
    type: "status",
    order: 1,
    createdAt: now,
    updatedAt: now,
  });
  const optionNames = ["Not started", "In progress", "Done"];
  const optionColors = ["slate", "blue", "green"];
  const statusOptionIds: Id<"databaseSelectOptions">[] = [];
  for (const [order, name] of optionNames.entries()) {
    const optionId = await ctx.db.insert("databaseSelectOptions", {
      workspaceId,
      dataSourceId,
      propertyId: statusPropertyId,
      name,
      color: optionColors[order],
      order,
    });
    statusOptionIds.push(optionId);
  }
  const viewId = await ctx.db.insert("databaseViews", {
    workspaceId,
    dataSourceId,
    name: "Table",
    type: "table",
    order: 0,
    visiblePropertyIds: [titlePropertyId, statusPropertyId],
    sorts: [],
    createdAt: now,
    updatedAt: now,
  });

  return {
    documentId,
    dataSourceId,
    viewId,
    titlePropertyId,
    statusPropertyId,
    statusOptionIds,
  };
}

export async function addDatabaseRow(
  ctx: MutationCtx,
  workspaceId: string,
  args: { dataSourceId: Id<"dataSources">; title: string },
) {
  const dataSource = await requireDataSource(
    ctx,
    workspaceId,
    args.dataSourceId,
  );
  const title = args.title.trim() || "Untitled";
  if (title.length > 200) {
    throw databaseError("INVALID_TITLE", "Row title is too long");
  }
  const existingRows = await ctx.db
    .query("documents")
    .withIndex("by_user_and_data_source_and_archived", (q) =>
      q
        .eq("userId", workspaceId)
        .eq("dataSourceId", args.dataSourceId)
        .eq("isArchived", false),
    )
    .take(500);
  const now = Date.now();
  const documentId = await ctx.db.insert("documents", {
    title,
    userId: workspaceId,
    parentDocument: dataSource.databaseDocumentId,
    dataSourceId: args.dataSourceId,
    kind: "page",
    contentModel: "page_blocks",
    fullWidth: true,
    showToc: true,
    isArchived: false,
    isPublished: false,
    order: existingRows.length,
    updatedAt: now,
  });
  await ctx.db.insert("pageBlocks", {
    workspaceId,
    pageId: documentId,
    type: "paragraph",
    order: 0,
    text: "",
    createdAt: now,
    updatedAt: now,
  });
  return documentId;
}

export async function setDatabasePropertyValue(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    documentId: Id<"documents">;
    propertyId: Id<"databaseProperties">;
    value: PropertyValueInput;
  },
) {
  const row = await requireDatabaseRow(ctx, workspaceId, args.documentId);
  const property = await requireDatabaseProperty(
    ctx,
    workspaceId,
    args.propertyId,
  );
  if (property.dataSourceId !== row.dataSourceId) {
    throw databaseError(
      "PROPERTY_SOURCE_MISMATCH",
      "Property does not belong to this row's database",
    );
  }
  if (
    property.type === "title" ||
    property.type === "relation" ||
    property.type === "rollup" ||
    property.type === "formula"
  ) {
    throw databaseError(
      "UNSUPPORTED_VALUE_TYPE",
      "Use the row title or relation commands for this property",
    );
  }
  if (args.value.optionIds) {
    for (const optionId of args.value.optionIds) {
      const option = await ctx.db.get(optionId);
      if (!option || option.propertyId !== property._id) {
        throw databaseError(
          "INVALID_OPTION",
          "Select option does not belong to this property",
        );
      }
    }
  }
  const normalized = normalizePropertyValue(
    property.type as EditablePropertyType,
    args.value,
  );
  const existing = await ctx.db
    .query("databasePropertyValues")
    .withIndex("by_document_and_property", (q) =>
      q.eq("documentId", row._id).eq("propertyId", property._id),
    )
    .unique();
  const value: Omit<Doc<"databasePropertyValues">, "_id" | "_creationTime"> = {
    workspaceId,
    dataSourceId: property.dataSourceId,
    documentId: row._id,
    propertyId: property._id,
    type: property.type,
    ...normalized,
    updatedAt: Date.now(),
  };
  if (existing) {
    await ctx.db.replace(existing._id, value);
    return existing._id;
  }
  return await ctx.db.insert("databasePropertyValues", value);
}

export async function getDatabaseSnapshot(
  ctx: ReadCtx,
  workspaceId: string,
  documentId: Id<"documents">,
  viewId?: Id<"databaseViews">,
) {
  const document = await ctx.db.get(documentId);
  if (
    !document ||
    document.userId !== workspaceId ||
    document.kind !== "database" ||
    document.isArchived
  ) {
    return null;
  }
  const dataSource = await ctx.db
    .query("dataSources")
    .withIndex("by_database_document", (q) =>
      q.eq("databaseDocumentId", document._id),
    )
    .unique();
  if (!dataSource || dataSource.workspaceId !== workspaceId) return null;

  const [properties, options, views, rows, values, relations] =
    await Promise.all([
      ctx.db
        .query("databaseProperties")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", dataSource._id),
        )
        .take(100),
      ctx.db
        .query("databaseSelectOptions")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", dataSource._id),
        )
        .take(500),
      ctx.db
        .query("databaseViews")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", dataSource._id),
        )
        .take(50),
      ctx.db
        .query("documents")
        .withIndex("by_user_and_data_source_and_archived", (q) =>
          q
            .eq("userId", workspaceId)
            .eq("dataSourceId", dataSource._id)
            .eq("isArchived", false),
        )
        .take(200),
      ctx.db
        .query("databasePropertyValues")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", dataSource._id),
        )
        .take(5_000),
      ctx.db
        .query("databaseRelations")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", dataSource._id),
        )
        .take(5_000),
    ]);
  const propertyIds = new Set(properties.map((property) => property._id));
  const orderedViews = views.sort((a, b) => a.order - b.order);
  const activeView =
    orderedViews.find((view) => view._id === viewId) ?? orderedViews[0];
  const visibleRows = applyDatabaseView(rows, values, properties, activeView);
  const valuesByDocument = new Map<string, typeof values>();
  for (const value of values) {
    const list = valuesByDocument.get(value.documentId) ?? [];
    list.push(value);
    valuesByDocument.set(value.documentId, list);
  }
  const relationProperties = properties.filter(
    (property) => property.type === "relation" && property.relationDataSourceId,
  );
  const rollupProperties = properties.filter(
    (property) =>
      property.type === "rollup" &&
      property.rollupRelationPropertyId &&
      property.rollupTargetPropertyId &&
      property.rollupFunction,
  );
  const formulaProperties = properties.filter(
    (property) =>
      property.type === "formula" &&
      property.formulaVersion === 1 &&
      property.formulaAstJson,
  );
  const relationTargetSources = [
    ...new Set(
      relationProperties.map((property) => property.relationDataSourceId!),
    ),
  ];
  const targetRowsBySource = new Map<
    string,
    Array<{
      id: Id<"documents">;
      title: string;
      icon?: string;
    }>
  >();
  const targetValuesByDocumentAndProperty = new Map<
    string,
    Doc<"databasePropertyValues">
  >();
  await Promise.all(
    relationTargetSources.map(async (targetDataSourceId) => {
      const [targetRows, targetValues] = await Promise.all([
        ctx.db
          .query("documents")
          .withIndex("by_user_and_data_source_and_archived", (q) =>
            q
              .eq("userId", workspaceId)
              .eq("dataSourceId", targetDataSourceId)
              .eq("isArchived", false),
          )
          .take(500),
        ctx.db
          .query("databasePropertyValues")
          .withIndex("by_data_source", (q) =>
            q.eq("dataSourceId", targetDataSourceId),
          )
          .take(5_000),
      ]);
      for (const targetValue of targetValues) {
        targetValuesByDocumentAndProperty.set(
          `${targetValue.documentId}:${targetValue.propertyId}`,
          targetValue,
        );
      }
      targetRowsBySource.set(
        targetDataSourceId,
        targetRows
          .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
          .map((target) => ({
            id: target._id,
            title: target.title,
            icon: target.icon,
          })),
      );
    }),
  );
  const relationTargetsByRowAndProperty = new Map<string, Id<"documents">[]>();
  for (const relation of relations) {
    const key = `${relation.sourceDocumentId}:${relation.propertyId}`;
    const targets = relationTargetsByRowAndProperty.get(key) ?? [];
    targets.push(relation.targetDocumentId);
    relationTargetsByRowAndProperty.set(key, targets);
  }
  const targetRowById = new Map(
    [...targetRowsBySource.values()]
      .flat()
      .map((target) => [target.id as string, target]),
  );
  const targetPropertyById = new Map<
    string,
    Doc<"databaseProperties"> | null
  >();
  await Promise.all(
    rollupProperties.map(async (property) => {
      const targetPropertyId = property.rollupTargetPropertyId!;
      if (!targetPropertyById.has(targetPropertyId)) {
        targetPropertyById.set(
          targetPropertyId,
          await ctx.db.get(targetPropertyId),
        );
      }
    }),
  );

  const calculateRollup = (
    rowId: Id<"documents">,
    property: (typeof rollupProperties)[number],
  ) => {
    const targetIds =
      relationTargetsByRowAndProperty.get(
        `${rowId}:${property.rollupRelationPropertyId!}`,
      ) ?? [];
    if (property.rollupFunction === "count") return targetIds.length;

    const targetProperty = targetPropertyById.get(
      property.rollupTargetPropertyId!,
    );
    const targetValues: Array<string | number> = [];
    for (const targetId of targetIds) {
      if (targetProperty?.type === "title") {
        const targetRow = targetRowById.get(targetId);
        if (targetRow?.title) targetValues.push(targetRow.title);
        continue;
      }
      const value = targetValuesByDocumentAndProperty.get(
        `${targetId}:${property.rollupTargetPropertyId!}`,
      );
      if (!value) continue;
      if (property.rollupFunction === "count_values") {
        const isPresent =
          value.textValue !== undefined ||
          value.numberValue !== undefined ||
          value.booleanValue !== undefined ||
          value.dateStart !== undefined ||
          Boolean(value.optionIds?.length);
        if (isPresent) targetValues.push(1);
        continue;
      }
      if (value.numberValue !== undefined) {
        targetValues.push(value.numberValue);
      }
    }
    if (property.rollupFunction === "count_values") {
      return targetValues.length;
    }
    const numericValues = targetValues.filter(
      (value): value is number => typeof value === "number",
    );
    if (numericValues.length === 0) return undefined;
    if (property.rollupFunction === "sum") {
      return numericValues.reduce((sum, value) => sum + value, 0);
    }
    if (property.rollupFunction === "average") {
      return (
        numericValues.reduce((sum, value) => sum + value, 0) /
        numericValues.length
      );
    }
    if (property.rollupFunction === "min") return Math.min(...numericValues);
    if (property.rollupFunction === "max") return Math.max(...numericValues);
    return undefined;
  };

  const propertyById = new Map(
    properties.map((property) => [property._id as string, property]),
  );
  const optionById = new Map(
    options.map((option) => [option._id as string, option]),
  );
  const buildRowValues = (row: (typeof visibleRows)[number]) => {
    const storedValues = (valuesByDocument.get(row._id) ?? []).map((value) => ({
      id: value._id,
      propertyId: value.propertyId,
      type: value.type,
      textValue: value.textValue,
      numberValue: value.numberValue,
      booleanValue: value.booleanValue,
      dateStart: value.dateStart,
      dateEnd: value.dateEnd,
      optionIds: value.optionIds,
      relationDocuments: undefined,
    }));
    const relationValues = relationProperties.map((property) => ({
      id: undefined,
      propertyId: property._id,
      type: "relation" as const,
      textValue: undefined,
      numberValue: undefined,
      booleanValue: undefined,
      dateStart: undefined,
      dateEnd: undefined,
      optionIds: undefined,
      relationDocuments: (
        relationTargetsByRowAndProperty.get(`${row._id}:${property._id}`) ?? []
      ).flatMap((targetDocumentId) => {
        const target = targetRowById.get(targetDocumentId);
        return target ? [target] : [];
      }),
    }));
    const rollupValues = rollupProperties.map((property) => ({
      id: undefined,
      propertyId: property._id,
      type: "rollup" as const,
      textValue: undefined,
      numberValue: calculateRollup(row._id, property),
      booleanValue: undefined,
      dateStart: undefined,
      dateEnd: undefined,
      optionIds: undefined,
      relationDocuments: undefined,
    }));
    const valuesByPropertyId = new Map(
      [...storedValues, ...relationValues, ...rollupValues].map((value) => [
        value.propertyId as string,
        value,
      ]),
    );
    const formulaResults = new Map<string, FormulaRuntimeValue>();
    const resolving = new Set<string>();
    const resolveProperty = (propertyId: string): FormulaRuntimeValue => {
      const property = propertyById.get(propertyId);
      if (!property) return null;
      if (property.type === "title") return row.title;
      if (property.type === "formula") {
        if (formulaResults.has(propertyId)) {
          return formulaResults.get(propertyId) ?? null;
        }
        if (resolving.has(propertyId) || !property.formulaAstJson) return null;
        resolving.add(propertyId);
        const result = evaluateFormulaAst(
          property.formulaAstJson,
          resolveProperty,
        );
        resolving.delete(propertyId);
        formulaResults.set(propertyId, result);
        return result;
      }
      const value = valuesByPropertyId.get(propertyId);
      if (!value) return null;
      if (property.type === "relation") {
        return value.relationDocuments?.map((document) => document.title) ?? [];
      }
      if (property.type === "number" || property.type === "rollup") {
        return value.numberValue ?? null;
      }
      if (property.type === "checkbox") return value.booleanValue ?? false;
      if (property.type === "date") return value.dateStart ?? null;
      if (
        property.type === "select" ||
        property.type === "status" ||
        property.type === "multi_select"
      ) {
        const names = (value.optionIds ?? []).flatMap((optionId) => {
          const option = optionById.get(optionId);
          return option ? [option.name] : [];
        });
        return property.type === "multi_select" ? names : (names[0] ?? null);
      }
      return value.textValue ?? null;
    };
    const formulaValues = formulaProperties.map((property) => {
      const result = resolveProperty(property._id);
      const scalarResult = Array.isArray(result) ? result.join(", ") : result;
      return {
        id: undefined,
        propertyId: property._id,
        type: "formula" as const,
        textValue: typeof scalarResult === "string" ? scalarResult : undefined,
        numberValue:
          typeof scalarResult === "number" ? scalarResult : undefined,
        booleanValue:
          typeof scalarResult === "boolean" ? scalarResult : undefined,
        dateStart: undefined,
        dateEnd: undefined,
        optionIds: undefined,
        relationDocuments: undefined,
      };
    });
    return [
      ...storedValues,
      ...relationValues,
      ...rollupValues,
      ...formulaValues,
    ];
  };

  return {
    dataSource: {
      id: dataSource._id,
      documentId: dataSource.databaseDocumentId,
      name: dataSource.name,
    },
    activeViewId: activeView?._id,
    properties: properties
      .sort((a, b) => a.order - b.order)
      .map((property) => ({
        id: property._id,
        name: property.name,
        type: property.type,
        order: property.order,
        relationDataSourceId: property.relationDataSourceId,
        reciprocalPropertyId: property.reciprocalPropertyId,
        rollupRelationPropertyId: property.rollupRelationPropertyId,
        rollupTargetPropertyId: property.rollupTargetPropertyId,
        rollupFunction: property.rollupFunction,
        formulaExpression: property.formulaExpression,
        formulaVersion: property.formulaVersion,
        formulaDependencyPropertyIds: property.formulaDependencyPropertyIds,
      })),
    options: options
      .filter((option) => propertyIds.has(option.propertyId))
      .sort((a, b) => a.order - b.order)
      .map((option) => ({
        id: option._id,
        propertyId: option.propertyId,
        name: option.name,
        color: option.color,
        order: option.order,
      })),
    views: orderedViews.map((view) => ({
      id: view._id,
      name: view.name,
      type: view.type,
      order: view.order,
      visiblePropertyIds: view.visiblePropertyIds,
      sorts: view.sorts,
      filterJson: view.filterJson,
      groupPropertyId: view.groupPropertyId,
      datePropertyId: view.datePropertyId,
    })),
    relationOptions: relationProperties.map((property) => ({
      propertyId: property._id,
      rows: targetRowsBySource.get(property.relationDataSourceId!) ?? [],
    })),
    rows: visibleRows.map((row) => ({
      id: row._id,
      title: row.title,
      icon: row.icon,
      updatedAt: row.updatedAt,
      values: buildRowValues(row),
    })),
  };
}
