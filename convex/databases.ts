import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  addDatabaseRow,
  createDatabase,
  createReciprocalRelationProperty,
  databaseError,
  getDatabaseSnapshot,
  requireDatabaseProperty,
  requireDatabaseRow,
  requireDataSource,
  setDatabaseRelationTargets,
  setDatabasePropertyValue,
  updateDatabaseProperty,
} from "./lib/databaseDomain";
import { serializeViewFilters } from "./lib/databaseViewEngine";
import { compileFormulaExpression } from "./lib/formulaEngine";
import { getWorkspaceBillingScope, getWorkspaceScope } from "./lib/workspace";
import { requireProForUser } from "./lib/billingDomain";

const propertyTypeValidator = v.union(
  v.literal("title"),
  v.literal("text"),
  v.literal("number"),
  v.literal("select"),
  v.literal("multi_select"),
  v.literal("status"),
  v.literal("date"),
  v.literal("checkbox"),
  v.literal("url"),
  v.literal("relation"),
  v.literal("rollup"),
  v.literal("formula"),
);

const editablePropertyTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("select"),
  v.literal("multi_select"),
  v.literal("status"),
  v.literal("date"),
  v.literal("checkbox"),
  v.literal("url"),
);

const creatablePropertyTypeValidator = v.union(
  editablePropertyTypeValidator,
  v.literal("relation"),
  v.literal("rollup"),
  v.literal("formula"),
);

const rollupFunctionValidator = v.union(
  v.literal("count"),
  v.literal("count_values"),
  v.literal("sum"),
  v.literal("average"),
  v.literal("min"),
  v.literal("max"),
);

const viewTypeValidator = v.union(
  v.literal("table"),
  v.literal("board"),
  v.literal("calendar"),
  v.literal("timeline"),
);

const sortValidator = v.object({
  propertyId: v.id("databaseProperties"),
  direction: v.union(v.literal("asc"), v.literal("desc")),
});

const filterValidator = v.object({
  propertyId: v.id("databaseProperties"),
  operator: v.union(
    v.literal("equals"),
    v.literal("not_equals"),
    v.literal("contains"),
    v.literal("is_empty"),
    v.literal("is_not_empty"),
  ),
  value: v.optional(v.union(v.string(), v.number(), v.boolean())),
});

const propertyValidator = v.object({
  id: v.id("databaseProperties"),
  name: v.string(),
  type: propertyTypeValidator,
  order: v.number(),
  relationDataSourceId: v.optional(v.id("dataSources")),
  reciprocalPropertyId: v.optional(v.id("databaseProperties")),
  rollupRelationPropertyId: v.optional(v.id("databaseProperties")),
  rollupTargetPropertyId: v.optional(v.id("databaseProperties")),
  rollupFunction: v.optional(rollupFunctionValidator),
  formulaExpression: v.optional(v.string()),
  formulaVersion: v.optional(v.number()),
  formulaDependencyPropertyIds: v.optional(v.array(v.id("databaseProperties"))),
});

const optionValidator = v.object({
  id: v.id("databaseSelectOptions"),
  propertyId: v.id("databaseProperties"),
  name: v.string(),
  color: v.string(),
  order: v.number(),
});

const valueValidator = v.object({
  id: v.optional(v.id("databasePropertyValues")),
  propertyId: v.id("databaseProperties"),
  type: v.union(
    editablePropertyTypeValidator,
    v.literal("relation"),
    v.literal("rollup"),
    v.literal("formula"),
  ),
  textValue: v.optional(v.string()),
  numberValue: v.optional(v.number()),
  booleanValue: v.optional(v.boolean()),
  dateStart: v.optional(v.number()),
  dateEnd: v.optional(v.number()),
  optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
  relationDocuments: v.optional(
    v.array(
      v.object({
        id: v.id("documents"),
        title: v.string(),
        icon: v.optional(v.string()),
      }),
    ),
  ),
});

const viewValidator = v.object({
  id: v.id("databaseViews"),
  name: v.string(),
  type: viewTypeValidator,
  order: v.number(),
  visiblePropertyIds: v.array(v.id("databaseProperties")),
  sorts: v.array(sortValidator),
  filterJson: v.optional(v.string()),
  groupPropertyId: v.optional(v.id("databaseProperties")),
  datePropertyId: v.optional(v.id("databaseProperties")),
  hiddenOptionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
  colorColumns: v.optional(v.boolean()),
});

const databaseViewValidator = v.union(
  v.null(),
  v.object({
    dataSource: v.object({
      id: v.id("dataSources"),
      documentId: v.id("documents"),
      name: v.string(),
    }),
    activeViewId: v.optional(v.id("databaseViews")),
    properties: v.array(propertyValidator),
    options: v.array(optionValidator),
    views: v.array(viewValidator),
    relationOptions: v.array(
      v.object({
        propertyId: v.id("databaseProperties"),
        rows: v.array(
          v.object({
            id: v.id("documents"),
            title: v.string(),
            icon: v.optional(v.string()),
          }),
        ),
      }),
    ),
    rows: v.array(
      v.object({
        id: v.id("documents"),
        title: v.string(),
        icon: v.optional(v.string()),
        updatedAt: v.optional(v.number()),
        values: v.array(valueValidator),
      }),
    ),
  }),
);

const requireWorkspaceId = async (
  ctx: Parameters<typeof getWorkspaceScope>[0],
) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw databaseError("UNAUTHENTICATED", "Sign in to manage databases");
  }
  return await getWorkspaceScope(ctx, identity.subject);
};

const requireProWorkspaceId = async (
  ctx: Parameters<typeof getWorkspaceScope>[0],
) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw databaseError("UNAUTHENTICATED", "Sign in to manage databases");
  }
  const scope = await getWorkspaceBillingScope(ctx, identity.subject);
  await requireProForUser(ctx, scope.billingOwnerId);
  return scope.workspaceId;
};

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  returns: v.object({
    documentId: v.id("documents"),
    dataSourceId: v.id("dataSources"),
    viewId: v.id("databaseViews"),
    titlePropertyId: v.id("databaseProperties"),
    statusPropertyId: v.id("databaseProperties"),
    statusOptionIds: v.array(v.id("databaseSelectOptions")),
  }),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    return await createDatabase(ctx, workspaceId, args);
  },
});

export const getByDocument = query({
  args: {
    documentId: v.id("documents"),
    viewId: v.optional(v.id("databaseViews")),
  },
  returns: databaseViewValidator,
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    return await getDatabaseSnapshot(
      ctx,
      workspaceId,
      args.documentId,
      args.viewId,
    );
  },
});

export const getBySource = query({
  args: {
    dataSourceId: v.id("dataSources"),
    viewId: v.optional(v.id("databaseViews")),
  },
  returns: databaseViewValidator,
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    const source = await requireDataSource(ctx, workspaceId, args.dataSourceId);
    return await getDatabaseSnapshot(
      ctx,
      workspaceId,
      source.databaseDocumentId,
      args.viewId,
    );
  },
});

export const listAvailable = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("dataSources"),
      documentId: v.id("documents"),
      name: v.string(),
      views: v.array(
        v.object({
          id: v.id("databaseViews"),
          name: v.string(),
          type: viewTypeValidator,
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const workspaceId = await requireWorkspaceId(ctx);
    const [sources, views] = await Promise.all([
      ctx.db
        .query("dataSources")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(100),
      ctx.db
        .query("databaseViews")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(500),
    ]);
    const results = [];
    for (const source of sources) {
      const document = await ctx.db.get(source.databaseDocumentId);
      if (!document || document.isArchived || document.userId !== workspaceId) {
        continue;
      }
      results.push({
        id: source._id,
        documentId: source.databaseDocumentId,
        name: source.name,
        views: views
          .filter((view) => view.dataSourceId === source._id)
          .sort((left, right) => left.order - right.order)
          .map((view) => ({ id: view._id, name: view.name, type: view.type })),
      });
    }
    return results;
  },
});

export const getRollupConfigurationOptions = query({
  args: { dataSourceId: v.id("dataSources") },
  returns: v.array(
    v.object({
      relationPropertyId: v.id("databaseProperties"),
      relationName: v.string(),
      targetDataSourceId: v.id("dataSources"),
      targetDataSourceName: v.string(),
      targetProperties: v.array(
        v.object({
          id: v.id("databaseProperties"),
          name: v.string(),
          type: propertyTypeValidator,
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    await requireDataSource(ctx, workspaceId, args.dataSourceId);
    const properties = await ctx.db
      .query("databaseProperties")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(100);
    const relationProperties = properties.filter(
      (property) =>
        property.type === "relation" && property.relationDataSourceId,
    );
    return await Promise.all(
      relationProperties.map(async (relation) => {
        const targetSource = await requireDataSource(
          ctx,
          workspaceId,
          relation.relationDataSourceId!,
        );
        const targetProperties = await ctx.db
          .query("databaseProperties")
          .withIndex("by_data_source", (q) =>
            q.eq("dataSourceId", targetSource._id),
          )
          .take(100);
        return {
          relationPropertyId: relation._id,
          relationName: relation.name,
          targetDataSourceId: targetSource._id,
          targetDataSourceName: targetSource.name,
          targetProperties: targetProperties
            .sort((left, right) => left.order - right.order)
            .map((property) => ({
              id: property._id,
              name: property.name,
              type: property.type,
            })),
        };
      }),
    );
  },
});

export const addRow = mutation({
  args: {
    dataSourceId: v.id("dataSources"),
    title: v.string(),
    templateId: v.optional(v.id("databaseRowTemplates")),
    initialValues: v.optional(
      v.array(
        v.object({
          propertyId: v.id("databaseProperties"),
          textValue: v.optional(v.string()),
          numberValue: v.optional(v.number()),
          booleanValue: v.optional(v.boolean()),
          dateStart: v.optional(v.number()),
          dateEnd: v.optional(v.number()),
          optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
        }),
      ),
    ),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    return await addDatabaseRow(ctx, workspaceId, args);
  },
});

const rowTemplateValidator = v.object({
  id: v.id("databaseRowTemplates"),
  name: v.string(),
  isDefault: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listRowTemplates = query({
  args: { dataSourceId: v.id("dataSources") },
  returns: v.array(rowTemplateValidator),
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceId(ctx);
    await requireDataSource(ctx, workspaceId, args.dataSourceId);
    const templates = await ctx.db
      .query("databaseRowTemplates")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(100);
    return templates
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: template._id,
        name: template.name,
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }));
  },
});

export const createRowTemplateFromRow = mutation({
  args: {
    dataSourceId: v.id("dataSources"),
    documentId: v.id("documents"),
    name: v.string(),
  },
  returns: v.id("databaseRowTemplates"),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    await requireDataSource(ctx, workspaceId, args.dataSourceId);
    const row = await requireDatabaseRow(ctx, workspaceId, args.documentId);
    if (row.dataSourceId !== args.dataSourceId) {
      throw databaseError("ROW_SOURCE_MISMATCH", "Row belongs to another database");
    }
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw databaseError("INVALID_TEMPLATE_NAME", "Template name is required");
    }
    const [values, blocks, existing] = await Promise.all([
      ctx.db
        .query("databasePropertyValues")
        .withIndex("by_document", (q) => q.eq("documentId", row._id))
        .take(100),
      ctx.db
        .query("pageBlocks")
        .withIndex("by_page", (q) => q.eq("pageId", row._id))
        .take(251),
      ctx.db
        .query("databaseRowTemplates")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", args.dataSourceId),
        )
        .take(100),
    ]);
    if (blocks.length > 250) {
      throw databaseError("TEMPLATE_TOO_LARGE", "Template exceeds 250 blocks");
    }
    const unsupported = blocks.find(
      (block) =>
        block.parentBlockId ||
        [
          "database_view",
          "child_page",
          "columns",
          "column",
          "synced_reference",
          "blocknote",
        ].includes(block.type),
    );
    if (unsupported) {
      throw databaseError(
        "UNSUPPORTED_TEMPLATE_BLOCK",
        `Template cannot include ${unsupported.type} blocks yet`,
      );
    }
    const now = Date.now();
    return await ctx.db.insert("databaseRowTemplates", {
      workspaceId,
      dataSourceId: args.dataSourceId,
      name,
      isDefault: existing.length === 0,
      initialValues: values.map((value) => ({
        propertyId: value.propertyId,
        textValue: value.textValue,
        numberValue: value.numberValue,
        booleanValue: value.booleanValue,
        dateStart: value.dateStart,
        dateEnd: value.dateEnd,
        optionIds: value.optionIds,
      })),
      blocks: blocks.map((block) => ({
        type: block.type,
        order: block.order,
        text: block.text,
        checked: block.checked,
        url: block.url,
        alt: block.alt,
        caption: block.caption,
        color: block.color,
      })),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setDefaultRowTemplate = mutation({
  args: {
    dataSourceId: v.id("dataSources"),
    templateId: v.optional(v.id("databaseRowTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    await requireDataSource(ctx, workspaceId, args.dataSourceId);
    const templates = await ctx.db
      .query("databaseRowTemplates")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(100);
    if (
      args.templateId &&
      !templates.some((template) => template._id === args.templateId)
    ) {
      throw databaseError("TEMPLATE_NOT_FOUND", "Template not found");
    }
    for (const template of templates) {
      const isDefault = template._id === args.templateId;
      if (template.isDefault !== isDefault) {
        await ctx.db.patch(template._id, { isDefault, updatedAt: Date.now() });
      }
    }
    return null;
  },
});

export const updateRowTitle = mutation({
  args: { documentId: v.id("documents"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    await requireDatabaseRow(ctx, workspaceId, args.documentId);
    const title = args.title.trim() || "Untitled";
    if (title.length > 200) {
      throw databaseError("INVALID_TITLE", "Row title is too long");
    }
    await ctx.db.patch(args.documentId, { title, updatedAt: Date.now() });
    return null;
  },
});

export const addProperty = mutation({
  args: {
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    type: creatablePropertyTypeValidator,
    relationDataSourceId: v.optional(v.id("dataSources")),
    reciprocalName: v.optional(v.string()),
    rollupRelationPropertyId: v.optional(v.id("databaseProperties")),
    rollupTargetPropertyId: v.optional(v.id("databaseProperties")),
    rollupFunction: v.optional(rollupFunctionValidator),
    formulaExpression: v.optional(v.string()),
  },
  returns: v.id("databaseProperties"),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    await requireDataSource(ctx, workspaceId, args.dataSourceId);
    if (args.type === "relation") {
      if (!args.relationDataSourceId) {
        throw databaseError(
          "RELATION_TARGET_REQUIRED",
          "Choose a target database for this relation",
        );
      }
      await requireDataSource(ctx, workspaceId, args.relationDataSourceId);
    } else if (args.relationDataSourceId) {
      throw databaseError(
        "INVALID_RELATION_TARGET",
        "Only relation properties accept a target database",
      );
    }
    if (args.reciprocalName && args.type !== "relation") {
      throw databaseError(
        "INVALID_RECIPROCAL_RELATION",
        "Only relation properties can create a reciprocal property",
      );
    }
    if (args.type === "rollup") {
      if (
        !args.rollupRelationPropertyId ||
        !args.rollupTargetPropertyId ||
        !args.rollupFunction
      ) {
        throw databaseError(
          "ROLLUP_CONFIGURATION_REQUIRED",
          "Choose a relation, target property, and aggregation",
        );
      }
      const [relationProperty, targetProperty] = await Promise.all([
        requireDatabaseProperty(
          ctx,
          workspaceId,
          args.rollupRelationPropertyId,
        ),
        requireDatabaseProperty(ctx, workspaceId, args.rollupTargetPropertyId),
      ]);
      if (
        relationProperty.dataSourceId !== args.dataSourceId ||
        relationProperty.type !== "relation" ||
        !relationProperty.relationDataSourceId ||
        targetProperty.dataSourceId !== relationProperty.relationDataSourceId
      ) {
        throw databaseError(
          "INVALID_ROLLUP_CONFIGURATION",
          "Rollup properties must follow a relation into its target database",
        );
      }
      if (
        ["sum", "average", "min", "max"].includes(args.rollupFunction) &&
        targetProperty.type !== "number"
      ) {
        throw databaseError(
          "ROLLUP_NUMBER_REQUIRED",
          "This aggregation requires a number property",
        );
      }
    } else if (
      args.rollupRelationPropertyId ||
      args.rollupTargetPropertyId ||
      args.rollupFunction
    ) {
      throw databaseError(
        "INVALID_ROLLUP_CONFIGURATION",
        "Only rollup properties accept rollup configuration",
      );
    }
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw databaseError("INVALID_NAME", "Property name is required");
    }
    const properties = await ctx.db
      .query("databaseProperties")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(100);
    if (properties.length >= 100) {
      throw databaseError(
        "PROPERTY_LIMIT",
        "This database already has 100 properties",
      );
    }
    let compiledFormula:
      ReturnType<typeof compileFormulaExpression> | undefined;
    if (args.type === "formula") {
      if (!args.formulaExpression) {
        throw databaseError(
          "FORMULA_REQUIRED",
          "Enter an expression for this formula",
        );
      }
      try {
        compiledFormula = compileFormulaExpression(
          args.formulaExpression,
          properties.map((property) => ({
            id: property._id,
            name: property.name,
          })),
        );
      } catch (error) {
        throw databaseError(
          "INVALID_FORMULA",
          error instanceof Error ? error.message : "Formula is invalid",
        );
      }
    } else if (args.formulaExpression) {
      throw databaseError(
        "INVALID_FORMULA",
        "Only formula properties accept an expression",
      );
    }
    const now = Date.now();
    const propertyId = await ctx.db.insert("databaseProperties", {
      workspaceId,
      dataSourceId: args.dataSourceId,
      name,
      type: args.type,
      relationDataSourceId: args.relationDataSourceId,
      rollupRelationPropertyId: args.rollupRelationPropertyId,
      rollupTargetPropertyId: args.rollupTargetPropertyId,
      rollupFunction: args.rollupFunction,
      formulaExpression: args.formulaExpression?.trim(),
      formulaVersion: compiledFormula?.version,
      formulaAstJson: compiledFormula?.astJson,
      formulaDependencyPropertyIds: compiledFormula?.dependencyPropertyIds as
        Id<"databaseProperties">[] | undefined,
      order: properties.length,
      createdAt: now,
      updatedAt: now,
    });
    const views = await ctx.db
      .query("databaseViews")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .take(50);
    for (const view of views) {
      await ctx.db.patch(view._id, {
        visiblePropertyIds: [...view.visiblePropertyIds, propertyId],
        updatedAt: now,
      });
    }
    if (args.type === "relation" && args.reciprocalName) {
      await createReciprocalRelationProperty(ctx, workspaceId, {
        primaryPropertyId: propertyId,
        name: args.reciprocalName,
      });
    }
    if (args.type === "status") {
      const names = ["Not started", "In progress", "Done"];
      const colors = ["slate", "blue", "green"];
      for (const [order, name] of names.entries()) {
        await ctx.db.insert("databaseSelectOptions", {
          workspaceId,
          dataSourceId: args.dataSourceId,
          propertyId,
          name,
          color: colors[order],
          order,
        });
      }
    }
    return propertyId;
  },
});

export const updateProperty = mutation({
  args: {
    propertyId: v.id("databaseProperties"),
    name: v.optional(v.string()),
    formulaExpression: v.optional(v.string()),
  },
  returns: v.object({
    propertyId: v.id("databaseProperties"),
    name: v.string(),
    formulaExpression: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    return await updateDatabaseProperty(ctx, workspaceId, args);
  },
});

export const setValue = mutation({
  args: {
    documentId: v.id("documents"),
    propertyId: v.id("databaseProperties"),
    textValue: v.optional(v.string()),
    numberValue: v.optional(v.number()),
    booleanValue: v.optional(v.boolean()),
    dateStart: v.optional(v.number()),
    dateEnd: v.optional(v.number()),
    optionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
  },
  returns: v.id("databasePropertyValues"),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    const { documentId, propertyId, ...value } = args;
    return await setDatabasePropertyValue(ctx, workspaceId, {
      documentId,
      propertyId,
      value,
    });
  },
});

export const setRelation = mutation({
  args: {
    documentId: v.id("documents"),
    propertyId: v.id("databaseProperties"),
    targetDocumentIds: v.array(v.id("documents")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    await setDatabaseRelationTargets(ctx, workspaceId, args);
    return null;
  },
});

export const addSelectOption = mutation({
  args: {
    propertyId: v.id("databaseProperties"),
    name: v.string(),
    color: v.string(),
  },
  returns: v.id("databaseSelectOptions"),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    const property = await requireDatabaseProperty(
      ctx,
      workspaceId,
      args.propertyId,
    );
    if (!["select", "multi_select", "status"].includes(property.type)) {
      throw databaseError(
        "INVALID_PROPERTY_TYPE",
        "Property does not support options",
      );
    }
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw databaseError("INVALID_OPTION", "Option name is required");
    }
    const options = await ctx.db
      .query("databaseSelectOptions")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100);
    return await ctx.db.insert("databaseSelectOptions", {
      workspaceId,
      dataSourceId: property.dataSourceId,
      propertyId: property._id,
      name,
      color: args.color.slice(0, 30) || "slate",
      order: options.length,
    });
  },
});

export const updateSelectOption = mutation({
  args: {
    optionId: v.id("databaseSelectOptions"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    const option = await ctx.db.get(args.optionId);
    if (!option || option.workspaceId !== workspaceId) {
      throw databaseError("OPTION_NOT_FOUND", "Select option not found");
    }
    const name = args.name?.trim();
    if (args.name !== undefined && (!name || name.length > 100)) {
      throw databaseError("INVALID_OPTION", "Option name is required");
    }
    await ctx.db.patch(option._id, {
      ...(name ? { name } : {}),
      ...(args.color !== undefined
        ? { color: args.color.slice(0, 30) || "slate" }
        : {}),
    });
    return null;
  },
});

export const removeSelectOption = mutation({
  args: { optionId: v.id("databaseSelectOptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    const option = await ctx.db.get(args.optionId);
    if (!option || option.workspaceId !== workspaceId) {
      throw databaseError("OPTION_NOT_FOUND", "Select option not found");
    }
    const values = await ctx.db
      .query("databasePropertyValues")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", option.dataSourceId),
      )
      .take(2_000);
    for (const value of values) {
      if (!value.optionIds?.includes(option._id)) continue;
      await ctx.db.patch(value._id, {
        optionIds: value.optionIds.filter((id) => id !== option._id),
        updatedAt: Date.now(),
      });
    }
    await ctx.db.delete(option._id);
    return null;
  },
});

export const createView = mutation({
  args: {
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    type: viewTypeValidator,
  },
  returns: v.id("databaseViews"),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    await requireDataSource(ctx, workspaceId, args.dataSourceId);
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw databaseError("INVALID_VIEW_NAME", "View name is required");
    }
    const [views, properties] = await Promise.all([
      ctx.db
        .query("databaseViews")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", args.dataSourceId),
        )
        .take(50),
      ctx.db
        .query("databaseProperties")
        .withIndex("by_data_source", (q) =>
          q.eq("dataSourceId", args.dataSourceId),
        )
        .take(100),
    ]);
    if (views.length >= 50) {
      throw databaseError("VIEW_LIMIT", "This database already has 50 views");
    }
    const orderedProperties = properties.sort((a, b) => a.order - b.order);
    const groupProperty = orderedProperties.find((property) =>
      ["status", "select"].includes(property.type),
    );
    const dateProperty = orderedProperties.find(
      (property) => property.type === "date",
    );
    if (args.type === "board" && !groupProperty) {
      throw databaseError(
        "GROUP_PROPERTY_REQUIRED",
        "Add a status or select property before creating a pipeline",
      );
    }
    if (["calendar", "timeline"].includes(args.type) && !dateProperty) {
      throw databaseError(
        "DATE_PROPERTY_REQUIRED",
        "Add a date property before creating this view",
      );
    }
    const now = Date.now();
    return await ctx.db.insert("databaseViews", {
      workspaceId,
      dataSourceId: args.dataSourceId,
      name,
      type: args.type,
      order: views.length,
      visiblePropertyIds: orderedProperties.map((property) => property._id),
      sorts: [],
      groupPropertyId: args.type === "board" ? groupProperty?._id : undefined,
      datePropertyId: ["calendar", "timeline"].includes(args.type)
        ? dateProperty?._id
        : undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateView = mutation({
  args: {
    viewId: v.id("databaseViews"),
    name: v.optional(v.string()),
    type: v.optional(viewTypeValidator),
    visiblePropertyIds: v.optional(v.array(v.id("databaseProperties"))),
    sorts: v.optional(v.array(sortValidator)),
    filters: v.optional(v.array(filterValidator)),
    groupPropertyId: v.optional(v.id("databaseProperties")),
    datePropertyId: v.optional(v.id("databaseProperties")),
    hiddenOptionIds: v.optional(v.array(v.id("databaseSelectOptions"))),
    colorColumns: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view || view.workspaceId !== workspaceId) {
      throw databaseError("VIEW_NOT_FOUND", "Database view not found");
    }
    const properties = await ctx.db
      .query("databaseProperties")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", view.dataSourceId),
      )
      .take(100);
    const propertyById = new Map(
      properties.map((property) => [property._id as string, property]),
    );
    if (args.type !== undefined) {
      const newType = args.type;
      const groupProperty = properties.find((property) =>
        ["status", "select"].includes(property.type),
      );
      const dateProperty = properties.find(
        (property) => property.type === "date",
      );
      if (newType === "board" && !groupProperty) {
        throw databaseError(
          "GROUP_PROPERTY_REQUIRED",
          "Add a status or select property before making this a pipeline",
        );
      }
      if (["calendar", "timeline"].includes(newType) && !dateProperty) {
        throw databaseError(
          "DATE_PROPERTY_REQUIRED",
          "Add a date property before making this a calendar or timeline",
        );
      }
      if (newType === "board" && !view.groupPropertyId) {
        args = { ...args, groupPropertyId: groupProperty?._id };
      }
      if (["calendar", "timeline"].includes(newType) && !view.datePropertyId) {
        args = { ...args, datePropertyId: dateProperty?._id };
      }
    }
    const referencedIds = [
      ...(args.visiblePropertyIds ?? []),
      ...(args.sorts ?? []).map((sort) => sort.propertyId),
      ...(args.filters ?? []).map((filter) => filter.propertyId),
      ...(args.groupPropertyId ? [args.groupPropertyId] : []),
      ...(args.datePropertyId ? [args.datePropertyId] : []),
    ];
    if (referencedIds.some((propertyId) => !propertyById.has(propertyId))) {
      throw databaseError(
        "PROPERTY_SOURCE_MISMATCH",
        "Every view property must belong to this database",
      );
    }
    if (
      args.groupPropertyId &&
      !["status", "select"].includes(
        propertyById.get(args.groupPropertyId)?.type ?? "",
      )
    ) {
      throw databaseError(
        "INVALID_GROUP_PROPERTY",
        "Pipelines can group only by status or select properties",
      );
    }
    if (
      args.datePropertyId &&
      propertyById.get(args.datePropertyId)?.type !== "date"
    ) {
      throw databaseError(
        "INVALID_DATE_PROPERTY",
        "Calendar and timeline views require a date property",
      );
    }
    for (const optionId of args.hiddenOptionIds ?? []) {
      const option = await ctx.db.get(optionId);
      if (!option || option.dataSourceId !== view.dataSourceId) {
        throw databaseError(
          "OPTION_SOURCE_MISMATCH",
          "Every hidden group must belong to this database",
        );
      }
    }
    const name = args.name?.trim();
    if (args.name !== undefined && (!name || name.length > 100)) {
      throw databaseError("INVALID_VIEW_NAME", "View name is required");
    }
    await ctx.db.patch(view._id, {
      ...(name !== undefined ? { name } : {}),
      ...(args.type !== undefined ? { type: args.type } : {}),
      ...(args.visiblePropertyIds !== undefined
        ? { visiblePropertyIds: args.visiblePropertyIds }
        : {}),
      ...(args.sorts !== undefined ? { sorts: args.sorts } : {}),
      ...(args.filters !== undefined
        ? { filterJson: serializeViewFilters(args.filters) }
        : {}),
      ...(args.groupPropertyId !== undefined
        ? { groupPropertyId: args.groupPropertyId }
        : {}),
      ...(args.datePropertyId !== undefined
        ? { datePropertyId: args.datePropertyId }
        : {}),
      ...(args.hiddenOptionIds !== undefined
        ? { hiddenOptionIds: args.hiddenOptionIds }
        : {}),
      ...(args.colorColumns !== undefined
        ? { colorColumns: args.colorColumns }
        : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteView = mutation({
  args: {
    viewId: v.id("databaseViews"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspaceId = await requireProWorkspaceId(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view || view.workspaceId !== workspaceId) {
      throw databaseError("VIEW_NOT_FOUND", "Database view not found");
    }
    const views = await ctx.db
      .query("databaseViews")
      .withIndex("by_data_source", (q) =>
        q.eq("dataSourceId", view.dataSourceId),
      )
      .collect();
    if (views.length <= 1) {
      throw databaseError(
        "LAST_VIEW",
        "A database needs at least one view",
      );
    }
    await ctx.db.delete(args.viewId);
    const remaining = views
      .filter((candidate) => candidate._id !== args.viewId)
      .sort((a, b) => a.order - b.order);
    await Promise.all(
      remaining.map((candidate, index) =>
        ctx.db.patch(candidate._id, { order: index }),
      ),
    );
    return null;
  },
});
