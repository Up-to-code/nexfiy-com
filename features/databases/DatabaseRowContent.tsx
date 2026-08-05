"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { DateTimePickerPopover } from "./DateTimePickerPopover";

import { useDatabase } from "./useDatabase";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;

const TAG_COLORS = ["blue", "green", "purple", "orange", "pink"];

function TagsEditor({
  propertyId,
  selectedIds,
  options,
  onSetValue,
  onAddOption,
}: {
  propertyId: Id<"databaseProperties">;
  selectedIds: Id<"databaseSelectOptions">[];
  options: DatabaseData["options"];
  onSetValue: (optionIds: Id<"databaseSelectOptions">[]) => Promise<boolean>;
  onAddOption: ReturnType<typeof useDatabase>["addSelectOption"];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const selected = selectedIds
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is NonNullable<typeof option> => Boolean(option));

  const addTag = async () => {
    const tagName = draft.trim();
    if (!tagName) return;
    const existing = options.find(
      (option) => option.name.toLowerCase() === tagName.toLowerCase(),
    );
    const optionId =
      existing?.id ??
      (await onAddOption({
        propertyId,
        name: tagName,
        color: TAG_COLORS[options.length % TAG_COLORS.length],
      }));
    if (optionId && !selectedIds.includes(optionId)) {
      await onSetValue([...selectedIds, optionId]);
    }
    setDraft("");
  };

  return (
    <div className="flex min-h-8 max-w-xl flex-wrap items-center gap-1.5 py-1">
      {selected.map((option) => (
        <span
          key={option.id}
          className="bg-muted inline-flex max-w-44 items-center gap-1 rounded px-1.5 py-0.5 text-xs"
        >
          <span className="truncate">{option.name}</span>
          <button
            type="button"
            aria-label={`Remove ${option.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() =>
              void onSetValue(selectedIds.filter((id) => id !== option.id))
            }
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            void addTag();
          }
        }}
        onBlur={() => void addTag()}
        placeholder={
          selected.length ? t("dialogs.rowAddTag") : t("dialogs.rowEmpty")
        }
        className="placeholder:text-muted-foreground h-7 min-w-20 max-w-48 flex-1 bg-transparent px-1 text-sm outline-none [field-sizing:content]"
      />
    </div>
  );
}

export function DatabaseRowContent({
  database,
  rowId,
  onUpdateTitle,
  onSetValue,
  onAddSelectOption,
  fullWidth = false,
  smallText = false,
  layout = "sheet",
}: {
  database: DatabaseData;
  rowId: Id<"documents">;
  onUpdateTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onAddSelectOption: ReturnType<typeof useDatabase>["addSelectOption"];
  fullWidth?: boolean;
  smallText?: boolean;
  layout?: "sheet" | "full";
}) {
  const { t } = useI18n();
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
        aria-label={t("dialogs.rowTitle")}
        defaultValue={row.title}
        className="mb-6 h-auto border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0 dark:bg-transparent"
        onBlur={(event) => onUpdateTitle(row.id, event.target.value)}
      />
      <div
        className={cn(
          "mb-10 border-b pb-8",
          layout === "full"
            ? "grid gap-x-10 gap-y-1 sm:grid-cols-2"
            : "max-w-2xl space-y-0.5",
        )}
      >
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
                ) : property.type === "multi_select" ? (
                  <TagsEditor
                    propertyId={property.id}
                    selectedIds={value?.optionIds ?? []}
                    options={options}
                    onAddOption={onAddSelectOption}
                    onSetValue={(optionIds) =>
                      onSetValue(row.id, property.id, { optionIds })
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
                    <SelectTrigger className="hover:bg-muted/40 h-8 w-fit min-w-24 max-w-80 border-0 bg-transparent px-2.5 text-sm shadow-none dark:bg-transparent">
                      <SelectValue placeholder={t("dialogs.rowEmpty")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty">{t("dialogs.rowEmpty")}</SelectItem>
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
                    className="hover:bg-muted/40 focus-visible:bg-muted/40 h-8 w-auto min-w-24 max-w-xl border-0 bg-transparent px-2.5 shadow-none [field-sizing:content] focus-visible:ring-0 dark:bg-transparent"
                    defaultValue={
                      value?.textValue ?? value?.numberValue?.toString() ?? ""
                    }
                    placeholder={t("dialogs.rowEmpty")}
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
      onAddSelectOption={state.addSelectOption}
      fullWidth={fullWidth}
      smallText={smallText}
      layout="full"
    />
  );
}
