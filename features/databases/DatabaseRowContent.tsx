"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { NormalizedBlockNoteEditor } from "@/features/blocks/NormalizedBlockNoteEditor";
import { cn } from "@/lib/utils";
import { DateTimePickerPopover } from "./DateTimePickerPopover";

import { useDatabase } from "./useDatabase";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;

export function DatabaseRowContent({
  database,
  rowId,
  onUpdateTitle,
  onSetValue,
  fullWidth = false,
  smallText = false,
}: {
  database: DatabaseData;
  rowId: Id<"documents">;
  onUpdateTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  fullWidth?: boolean;
  smallText?: boolean;
}) {
  const row = database.rows.find((candidate) => candidate.id === rowId);
  if (!row) return null;
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-8 sm:px-10 sm:py-10",
        fullWidth ? "max-w-none md:w-[90%]" : "max-w-3xl",
      )}
    >
      <Input
        aria-label="Page title"
        defaultValue={row.title}
        className="mb-6 h-auto border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0 dark:bg-transparent"
        onBlur={(event) => onUpdateTitle(row.id, event.target.value)}
      />
      <div className="mb-10 max-w-2xl space-y-0.5 border-b pb-8">
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
                className="group/property grid min-h-9 grid-cols-[140px_minmax(0,1fr)] items-center gap-3 text-sm"
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
                  <Select
                    value={value?.optionIds?.[0] ?? "empty"}
                    onValueChange={(nextValue) =>
                      void onSetValue(row.id, property.id, {
                        optionIds:
                          nextValue !== "empty"
                            ? [nextValue as Id<"databaseSelectOptions">]
                            : [],
                      })
                    }
                  >
                    <SelectTrigger className="hover:bg-muted/40 h-8 w-full border-0 bg-transparent px-2.5 text-sm shadow-none dark:bg-transparent">
                      <SelectValue placeholder="Empty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty">Empty</SelectItem>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : property.type === "date" ? (
                  <DateTimePickerPopover
                    value={value?.dateStart}
                    ariaLabel={`Edit ${property.name}`}
                    onChange={(dateStart) =>
                      void onSetValue(row.id, property.id, {
                        dateStart,
                      })
                    }
                  />
                ) : (
                  <Input
                    className="hover:bg-muted/40 focus-visible:bg-muted/40 h-8 border-0 bg-transparent px-2.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
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
      <NormalizedBlockNoteEditor
        pageId={row.id}
        editable
        smallText={smallText}
      />
    </div>
  );
}

export function DatabaseRowContentBySource({
  dataSourceId,
  rowId,
  fullWidth,
  smallText,
}: {
  dataSourceId: Id<"dataSources">;
  rowId: Id<"documents">;
  fullWidth?: boolean;
  smallText?: boolean;
}) {
  const state = useDatabase(undefined, undefined, dataSourceId);
  if (!state.database) return null;
  return (
    <DatabaseRowContent
      database={state.database}
      rowId={rowId}
      onUpdateTitle={state.updateRowTitle}
      onSetValue={state.setValue}
      fullWidth={fullWidth}
      smallText={smallText}
    />
  );
}
