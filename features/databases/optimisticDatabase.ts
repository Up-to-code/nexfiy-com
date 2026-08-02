import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionReturnType } from "convex/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type SetValueArgs = {
  documentId: Id<"documents">;
  propertyId: Id<"databaseProperties">;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateStart?: number;
  dateEnd?: number;
  optionIds?: Id<"databaseSelectOptions">[];
};

type DatabaseSnapshot = FunctionReturnType<typeof api.databases.getBySource>;
type EditableValueType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "checkbox"
  | "url";

function isEditableValueType(type: string): type is EditableValueType {
  return [
    "text",
    "number",
    "select",
    "multi_select",
    "status",
    "date",
    "checkbox",
    "url",
  ].includes(type);
}

function updateDatabaseSnapshot(
  snapshot: DatabaseSnapshot,
  args: SetValueArgs,
): DatabaseSnapshot {
  if (
    !snapshot ||
    !Array.isArray(snapshot.properties) ||
    !Array.isArray(snapshot.rows)
  ) {
    return snapshot;
  }
  const property = snapshot.properties.find(
    (candidate) => candidate.id === args.propertyId,
  );
  if (!property || !isEditableValueType(property.type)) return snapshot;
  const propertyType = property.type;

  const rows = snapshot.rows.map((row) => {
    if (row.id !== args.documentId) return row;
    const existing = row.values.find(
      (value) => value.propertyId === args.propertyId,
    );
    const nextValue: (typeof row.values)[number] = {
      id:
        existing?.id ??
        (`optimistic:${args.documentId}:${args.propertyId}` as Id<"databasePropertyValues">),
      propertyId: args.propertyId,
      type: propertyType,
      textValue: args.textValue,
      numberValue: args.numberValue,
      booleanValue: args.booleanValue,
      dateStart: args.dateStart,
      dateEnd: args.dateEnd,
      optionIds: args.optionIds,
      relationDocuments: undefined,
    };
    return {
      ...row,
      values: existing
        ? row.values.map((value) =>
            value.propertyId === args.propertyId ? nextValue : value,
          )
        : [...row.values, nextValue],
    };
  });

  return { ...snapshot, rows };
}

export function optimisticallySetDatabaseValue(
  store: OptimisticLocalStore,
  args: SetValueArgs,
) {
  for (const query of store.getAllQueries(api.databases.getByDocument)) {
    if (!query.value) continue;
    store.setQuery(
      api.databases.getByDocument,
      query.args,
      updateDatabaseSnapshot(query.value, args),
    );
  }
  for (const query of store.getAllQueries(api.databases.getBySource)) {
    if (!query.value) continue;
    store.setQuery(
      api.databases.getBySource,
      query.args,
      updateDatabaseSnapshot(query.value, args),
    );
  }
}
