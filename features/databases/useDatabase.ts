"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

import { optimisticallySetDatabaseValue } from "./optimisticDatabase";

type DatabaseSnapshot =
  FunctionReturnType<typeof api.databases.getBySource> | undefined;

function normalizeDatabaseSnapshot(snapshot: DatabaseSnapshot) {
  if (!snapshot) return snapshot;
  return {
    ...snapshot,
    properties: Array.isArray(snapshot.properties) ? snapshot.properties : [],
    options: Array.isArray(snapshot.options) ? snapshot.options : [],
    views: Array.isArray(snapshot.views) ? snapshot.views : [],
    relationOptions: Array.isArray(snapshot.relationOptions)
      ? snapshot.relationOptions.map((relation) => ({
          ...relation,
          rows: Array.isArray(relation.rows) ? relation.rows : [],
        }))
      : [],
    rows: Array.isArray(snapshot.rows)
      ? snapshot.rows.map((row) => ({
          ...row,
          values: Array.isArray(row.values) ? row.values : [],
        }))
      : [],
  };
}

export type EditablePropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "checkbox"
  | "url"
  | "relation"
  | "rollup"
  | "formula";

export type RollupFunction =
  "count" | "count_values" | "sum" | "average" | "min" | "max";

export function useDatabase(
  documentId?: Id<"documents">,
  viewId?: Id<"databaseViews">,
  dataSourceId?: Id<"dataSources">,
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const canQuery = isAuthenticated && !isAuthLoading;
  const databaseByDocument = useQuery(
    api.databases.getByDocument,
    canQuery && documentId ? { documentId, viewId } : "skip",
  );
  const databaseBySource = useQuery(
    api.databases.getBySource,
    canQuery && dataSourceId ? { dataSourceId, viewId } : "skip",
  );
  const rawDatabase = dataSourceId ? databaseBySource : databaseByDocument;
  const database =
    !isAuthLoading && !isAuthenticated
      ? null
      : normalizeDatabaseSnapshot(rawDatabase);
  const resolvedDataSourceId = database?.dataSource.id ?? dataSourceId;
  const rowTemplates = useQuery(
    api.databases.listRowTemplates,
    canQuery && resolvedDataSourceId
      ? { dataSourceId: resolvedDataSourceId }
      : "skip",
  );
  const addRowMutation = useMutation(api.databases.addRow);
  const updateRowTitleMutation = useMutation(api.databases.updateRowTitle);
  const addPropertyMutation = useMutation(api.databases.addProperty);
  const updatePropertyMutation = useMutation(api.databases.updateProperty);
  const setValueMutation = useMutation(
    api.databases.setValue,
  ).withOptimisticUpdate(optimisticallySetDatabaseValue);
  const setRelationMutation = useMutation(api.databases.setRelation);
  const createViewMutation = useMutation(api.databases.createView);
  const updateViewMutation = useMutation(api.databases.updateView);
  const deleteViewMutation = useMutation(api.databases.deleteView);
  const updateSelectOptionMutation = useMutation(
    api.databases.updateSelectOption,
  );
  const addSelectOptionMutation = useMutation(api.databases.addSelectOption);
  const removeSelectOptionMutation = useMutation(
    api.databases.removeSelectOption,
  );
  const createRowTemplateMutation = useMutation(
    api.databases.createRowTemplateFromRow,
  );

  const addRow = async (
    dataSourceId: Id<"dataSources">,
    initialValues?: Array<{
      propertyId: Id<"databaseProperties">;
      textValue?: string;
      numberValue?: number;
      booleanValue?: boolean;
      dateStart?: number;
      dateEnd?: number;
      optionIds?: Id<"databaseSelectOptions">[];
    }>,
    templateId?: Id<"databaseRowTemplates">,
  ) => {
    try {
      return await addRowMutation({
        dataSourceId,
        title: "Untitled",
        initialValues,
        templateId,
      });
    } catch (error) {
      logger.error("Failed to add database row", error);
      toast.error("Could not add the row");
      return null;
    }
  };

  const updateRowTitle = async (rowId: Id<"documents">, title: string) => {
    try {
      await updateRowTitleMutation({ documentId: rowId, title });
      return true;
    } catch (error) {
      logger.error("Failed to update database row title", error);
      toast.error("Could not update the row title");
      return false;
    }
  };

  const addProperty = async (input: {
    dataSourceId: Id<"dataSources">;
    name: string;
    type: EditablePropertyType;
    relationDataSourceId?: Id<"dataSources">;
    reciprocalName?: string;
    rollupRelationPropertyId?: Id<"databaseProperties">;
    rollupTargetPropertyId?: Id<"databaseProperties">;
    rollupFunction?: RollupFunction;
    formulaExpression?: string;
  }) => {
    try {
      await addPropertyMutation(input);
      toast.success("Property added");
      return true;
    } catch (error) {
      logger.error("Failed to add database property", error);
      toast.error("Could not add the property");
      return false;
    }
  };

  const setValue = async (
    documentId: Id<"documents">,
    propertyId: Id<"databaseProperties">,
    value: {
      textValue?: string;
      numberValue?: number;
      booleanValue?: boolean;
      dateStart?: number;
      dateEnd?: number;
      optionIds?: Id<"databaseSelectOptions">[];
    },
  ) => {
    try {
      await setValueMutation({ documentId, propertyId, ...value });
      return true;
    } catch (error) {
      logger.error("Failed to update database property", error);
      toast.error("Could not update the property");
      return false;
    }
  };

  const setRelation = async (
    documentId: Id<"documents">,
    propertyId: Id<"databaseProperties">,
    targetDocumentIds: Id<"documents">[],
  ) => {
    try {
      await setRelationMutation({
        documentId,
        propertyId,
        targetDocumentIds,
      });
      return true;
    } catch (error) {
      logger.error("Failed to update database relation", error);
      toast.error("Could not update the relation");
      return false;
    }
  };

  return {
    database,
    rowTemplates: rowTemplates ?? [],
    isLoading: isAuthLoading || (isAuthenticated && database === undefined),
    addRow,
    updateRowTitle,
    addProperty,
    updateProperty: async (input: {
      propertyId: Id<"databaseProperties">;
      name?: string;
      formulaExpression?: string;
    }) => {
      try {
        await updatePropertyMutation(input);
        toast.success("Property updated");
        return true;
      } catch (error) {
        logger.error("Failed to update database property", error);
        toast.error("Could not update the property");
        return false;
      }
    },
    setValue,
    setRelation,
    addSelectOption: async (input: {
      propertyId: Id<"databaseProperties">;
      name: string;
      color: string;
    }) => {
      try {
        return await addSelectOptionMutation(input);
      } catch (error) {
        logger.error("Failed to add select option", error);
        toast.error("Could not add that option");
        return null;
      }
    },
    updateSelectOption: async (input: {
      optionId: Id<"databaseSelectOptions">;
      name?: string;
      color?: string;
    }) => {
      try {
        await updateSelectOptionMutation(input);
        return true;
      } catch (error) {
        logger.error("Failed to update select option", error);
        toast.error("Could not update that group");
        return false;
      }
    },
    removeSelectOption: async (optionId: Id<"databaseSelectOptions">) => {
      try {
        await removeSelectOptionMutation({ optionId });
        return true;
      } catch (error) {
        logger.error("Failed to remove select option", error);
        toast.error("Could not remove that group");
        return false;
      }
    },
    createRowTemplate: async (input: {
      dataSourceId: Id<"dataSources">;
      documentId: Id<"documents">;
      name: string;
    }) => {
      try {
        await createRowTemplateMutation(input);
        toast.success("Template created");
        return true;
      } catch (error) {
        logger.error("Failed to create row template", error);
        toast.error("Could not create that template");
        return false;
      }
    },
    createView: async (input: {
      dataSourceId: Id<"dataSources">;
      name: string;
      type: "table" | "board" | "calendar" | "timeline";
    }) => {
      try {
        const createdViewId = await createViewMutation(input);
        toast.success(`${input.name} view created`);
        return createdViewId;
      } catch (error) {
        logger.error("Failed to create database view", error);
        toast.error("Could not create that view");
        return null;
      }
    },
    updateView: async (input: {
      viewId: Id<"databaseViews">;
      name?: string;
      type?: "table" | "board" | "calendar" | "timeline";
      visiblePropertyIds?: Id<"databaseProperties">[];
      sorts?: Array<{
        propertyId: Id<"databaseProperties">;
        direction: "asc" | "desc";
      }>;
      filters?: Array<{
        propertyId: Id<"databaseProperties">;
        operator:
          "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
        value?: string | number | boolean;
      }>;
      groupPropertyId?: Id<"databaseProperties">;
      datePropertyId?: Id<"databaseProperties">;
      hiddenOptionIds?: Id<"databaseSelectOptions">[];
      colorColumns?: boolean;
    }) => {
      try {
        await updateViewMutation(input);
        return true;
      } catch (error) {
        logger.error("Failed to update database view", error);
        toast.error("Could not update that view");
        return false;
      }
    },
    deleteView: async (viewId: Id<"databaseViews">) => {
      try {
        await deleteViewMutation({ viewId });
        toast.success("View deleted");
        return true;
      } catch (error) {
        logger.error("Failed to delete database view", error);
        toast.error("Could not delete that view");
        return false;
      }
    },
  };
}
