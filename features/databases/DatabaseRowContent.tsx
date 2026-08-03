"use client";

import { Input } from "@/components/ui/input";
import type { Id } from "@/convex/_generated/dataModel";
import { NormalizedBlockNoteEditor } from "@/features/blocks/NormalizedBlockNoteEditor";

import { useDatabase } from "./useDatabase";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;

export function DatabaseRowContent({
  database,
  rowId,
  onUpdateTitle,
  onSetValue,
}: {
  database: DatabaseData;
  rowId: Id<"documents">;
  onUpdateTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
}) {
  const row = database.rows.find((candidate) => candidate.id === rowId);
  if (!row) return null;
  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <Input
        aria-label="Page title"
        defaultValue={row.title}
        className="mb-8 h-auto border-0 px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
        onBlur={(event) => onUpdateTitle(row.id, event.target.value)}
      />
      <div className="mb-10 space-y-1 border-b pb-8">
        {database.properties
          .filter((property) => property.type !== "title")
          .map((property) => {
            const value = row.values.find(
              (candidate) => candidate.propertyId === property.id,
            );
            const options = database.options.filter(
              (option) => option.propertyId === property.id,
            );
            return (
              <div
                key={property.id}
                className="grid min-h-9 grid-cols-[160px_1fr] items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground truncate">
                  {property.name}
                </span>
                {property.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={value?.booleanValue ?? false}
                    onChange={(event) =>
                      void onSetValue(row.id, property.id, {
                        booleanValue: event.target.checked,
                      })
                    }
                  />
                ) : property.type === "select" || property.type === "status" ? (
                  <select
                    value={value?.optionIds?.[0] ?? ""}
                    className="bg-transparent text-sm outline-none"
                    onChange={(event) =>
                      void onSetValue(row.id, property.id, {
                        optionIds: event.target.value
                          ? [event.target.value as Id<"databaseSelectOptions">]
                          : [],
                      })
                    }
                  >
                    <option value="">Empty</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : property.type === "date" ? (
                  <Input
                    type="datetime-local"
                    className="h-8 border-0 px-0 shadow-none"
                    defaultValue={
                      value?.dateStart
                        ? new Date(
                            value.dateStart -
                              new Date(value.dateStart).getTimezoneOffset() *
                                60_000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onBlur={(event) =>
                      void onSetValue(row.id, property.id, {
                        dateStart: event.target.value
                          ? new Date(event.target.value).getTime()
                          : undefined,
                      })
                    }
                  />
                ) : (
                  <Input
                    className="h-8 border-0 px-0 shadow-none"
                    defaultValue={
                      value?.textValue ?? value?.numberValue?.toString() ?? ""
                    }
                    placeholder="Empty"
                    onBlur={(event) =>
                      void onSetValue(
                        row.id,
                        property.id,
                        property.type === "number"
                          ? {
                              numberValue: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            }
                          : { textValue: event.target.value },
                      )
                    }
                  />
                )}
              </div>
            );
          })}
      </div>
      <NormalizedBlockNoteEditor pageId={row.id} editable />
    </div>
  );
}

export function DatabaseRowContentBySource({
  dataSourceId,
  rowId,
}: {
  dataSourceId: Id<"dataSources">;
  rowId: Id<"documents">;
}) {
  const state = useDatabase(undefined, undefined, dataSourceId);
  if (!state.database) return null;
  return (
    <DatabaseRowContent
      database={state.database}
      rowId={rowId}
      onUpdateTitle={state.updateRowTitle}
      onSetValue={state.setValue}
    />
  );
}
