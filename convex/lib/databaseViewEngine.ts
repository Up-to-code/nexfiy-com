import type { Doc, Id } from "../_generated/dataModel";

export const FILTER_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];
export type DatabaseViewFilter = {
  propertyId: Id<"databaseProperties">;
  operator: FilterOperator;
  value?: string | number | boolean;
};

export function parseViewFilters(filterJson?: string): DatabaseViewFilter[] {
  if (!filterJson) return [];
  try {
    const parsed: unknown = JSON.parse(filterJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((filter) => {
      if (
        typeof filter !== "object" ||
        filter === null ||
        typeof (filter as { propertyId?: unknown }).propertyId !== "string" ||
        !FILTER_OPERATORS.includes(
          (filter as { operator?: FilterOperator }).operator as FilterOperator,
        )
      ) {
        return [];
      }
      const candidate = filter as DatabaseViewFilter;
      return [candidate];
    });
  } catch {
    return [];
  }
}

export function serializeViewFilters(filters: DatabaseViewFilter[]) {
  return JSON.stringify(filters);
}

function rawValue(
  row: Doc<"documents">,
  property: Doc<"databaseProperties">,
  valuesByProperty: Map<string, Doc<"databasePropertyValues">>,
) {
  if (property.type === "title") return row.title;
  const value = valuesByProperty.get(property._id);
  if (!value) return undefined;
  if (property.type === "number") return value.numberValue;
  if (property.type === "checkbox") return value.booleanValue;
  if (property.type === "date") return value.dateStart;
  if (["select", "status", "multi_select"].includes(property.type)) {
    return value.optionIds ?? [];
  }
  return value.textValue;
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function matchesFilter(value: unknown, filter: DatabaseViewFilter) {
  if (filter.operator === "is_empty") return isEmpty(value);
  if (filter.operator === "is_not_empty") return !isEmpty(value);
  if (filter.operator === "contains") {
    if (Array.isArray(value)) return value.includes(String(filter.value));
    return String(value ?? "")
      .toLocaleLowerCase()
      .includes(String(filter.value ?? "").toLocaleLowerCase());
  }
  const equal = Array.isArray(value)
    ? value.includes(String(filter.value))
    : String(value ?? "") === String(filter.value ?? "");
  return filter.operator === "equals" ? equal : !equal;
}

function compareValues(left: unknown, right: unknown) {
  if (isEmpty(left) && isEmpty(right)) return 0;
  if (isEmpty(left)) return 1;
  if (isEmpty(right)) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return String(Array.isArray(left) ? left[0] ?? "" : left).localeCompare(
    String(Array.isArray(right) ? right[0] ?? "" : right),
    undefined,
    { numeric: true, sensitivity: "base" },
  );
}

export function applyDatabaseView(
  rows: Doc<"documents">[],
  values: Doc<"databasePropertyValues">[],
  properties: Doc<"databaseProperties">[],
  view?: Doc<"databaseViews">,
) {
  const propertyById = new Map(
    properties.map((property) => [property._id as string, property]),
  );
  const valuesByDocument = new Map<
    string,
    Map<string, Doc<"databasePropertyValues">>
  >();
  for (const value of values) {
    const rowValues = valuesByDocument.get(value.documentId) ?? new Map();
    rowValues.set(value.propertyId, value);
    valuesByDocument.set(value.documentId, rowValues);
  }
  const filters = parseViewFilters(view?.filterJson);
  const filtered = rows.filter((row) =>
    filters.every((filter) => {
      const property = propertyById.get(filter.propertyId);
      if (!property) return true;
      return matchesFilter(
        rawValue(row, property, valuesByDocument.get(row._id) ?? new Map()),
        filter,
      );
    }),
  );
  return filtered.sort((left, right) => {
    for (const sort of view?.sorts ?? []) {
      const property = propertyById.get(sort.propertyId);
      if (!property) continue;
      const compared = compareValues(
        rawValue(left, property, valuesByDocument.get(left._id) ?? new Map()),
        rawValue(right, property, valuesByDocument.get(right._id) ?? new Map()),
      );
      if (compared !== 0) return sort.direction === "asc" ? compared : -compared;
    }
    return (left.order ?? 0) - (right.order ?? 0);
  });
}
