"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Check, Download, ExternalLink, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { downloadCsv, exportDatabaseToCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";
import { DateTimePickerPopover } from "./DateTimePickerPopover";
import { selectOptionColor } from "./selectOptionColors";
import {
  SELECT_OPTION_COLORS,
  type SelectOptionColor,
} from "./selectOptionColors";

const EMPTY_VALUE = "__empty__";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;
type DatabaseProperty = DatabaseData["properties"][number];
type DatabaseRow = DatabaseData["rows"][number];

const columnHelper = createColumnHelper<DatabaseRow>();

function DatabaseCell({
  property,
  row,
  database,
  onSetValue,
  onSetRelation,
  onRequestAddOption,
}: {
  property: DatabaseProperty;
  row: DatabaseRow;
  database: DatabaseData;
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onSetRelation: ReturnType<typeof useDatabase>["setRelation"];
  onRequestAddOption: (property: DatabaseProperty, row: DatabaseRow) => void;
}) {
  const value = row.values.find((item) => item.propertyId === property.id);

  if (property.type === "title") return null;

  if (property.type === "relation") {
    const selected = value?.relationDocuments ?? [];
    const options =
      database.relationOptions.find(
        (relation) => relation.propertyId === property.id,
      )?.rows ?? [];
    const selectedIds = new Set(selected.map((document) => document.id));
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${property.name} for ${row.title}`}
            className="h-auto min-h-8 min-w-48 justify-start px-2 font-normal"
          >
            {selected.length ? (
              <span className="flex max-w-64 flex-wrap gap-1">
                {selected.map((document) => (
                  <span
                    key={document.id}
                    className="bg-muted rounded px-1.5 py-0.5 text-xs"
                  >
                    {document.icon ? `${document.icon} ` : ""}
                    {document.title}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">Empty</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>{property.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => {
            const checked = selectedIds.has(option.id);
            return (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={checked}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() =>
                  onSetRelation(
                    row.id,
                    property.id,
                    checked
                      ? selected
                          .filter((document) => document.id !== option.id)
                          .map((document) => document.id)
                      : [...selected.map((document) => document.id), option.id],
                  )
                }
              >
                {option.icon ? `${option.icon} ` : ""}
                {option.title}
              </DropdownMenuCheckboxItem>
            );
          })}
          {!options.length ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">
              The related database has no pages yet.
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (property.type === "rollup" || property.type === "formula") {
    const displayValue =
      value?.numberValue ??
      value?.textValue ??
      (value?.booleanValue === undefined
        ? "Empty"
        : value.booleanValue
          ? "True"
          : "False");
    return (
      <span className="text-muted-foreground block min-w-28 px-2 py-1.5 tabular-nums">
        {displayValue}
      </span>
    );
  }

  if (property.type === "status" || property.type === "select") {
    const options = database.options.filter(
      (option) => option.propertyId === property.id,
    );
    const selectedId = value?.optionIds?.[0] ?? EMPTY_VALUE;
    const selected = options.find((option) => option.id === selectedId);
    return (
      <Select
        value={selectedId}
        onValueChange={(optionId) =>
          onSetValue(row.id, property.id, {
            optionIds:
              optionId === EMPTY_VALUE
                ? []
                : [optionId as Id<"databaseSelectOptions">],
          })
        }
      >
        <SelectTrigger
          aria-label={`${property.name} for ${row.title}`}
          className="h-8 min-w-36 border-0 bg-transparent px-2 shadow-none"
        >
          <SelectValue placeholder="Empty">
            {selected ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selectOptionColor(selected.color).pill,
                )}
              >
                {selected.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Empty</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_VALUE}>Empty</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <button
            type="button"
            className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            onClick={() => onRequestAddOption(property, row)}
          >
            <Plus className="size-4" /> Add new{" "}
            {property.type === "status" ? "status" : "option"}
          </button>
        </SelectContent>
      </Select>
    );
  }

  if (property.type === "checkbox") {
    return (
      <button
        type="button"
        aria-label={`${property.name} for ${row.title}`}
        aria-pressed={value?.booleanValue ?? false}
        className={cn(
          "ml-2 flex size-5 items-center justify-center rounded border",
          value?.booleanValue && "bg-primary text-primary-foreground",
        )}
        onClick={() =>
          onSetValue(row.id, property.id, {
            booleanValue: !(value?.booleanValue ?? false),
          })
        }
      >
        {value?.booleanValue ? <Check className="size-3.5" /> : null}
      </button>
    );
  }

  if (property.type === "date") {
    return (
      <DateTimePickerPopover
        ariaLabel={`${property.name} for ${row.title}`}
        value={value?.dateStart}
        onChange={(timestamp) =>
          onSetValue(row.id, property.id, {
            dateStart: timestamp,
          })
        }
      />
    );
  }

  if (property.type === "number") {
    return (
      <Input
        type="number"
        aria-label={`${property.name} for ${row.title}`}
        defaultValue={value?.numberValue ?? ""}
        className="h-8 min-w-28 border-0 bg-transparent shadow-none"
        onBlur={(event) =>
          onSetValue(row.id, property.id, {
            numberValue: event.target.value
              ? Number(event.target.value)
              : undefined,
          })
        }
      />
    );
  }

  return (
    <Input
      type={property.type === "url" ? "url" : "text"}
      aria-label={`${property.name} for ${row.title}`}
      defaultValue={value?.textValue ?? ""}
      className="h-8 min-w-40 border-0 bg-transparent shadow-none"
      placeholder="Empty"
      onBlur={(event) =>
        onSetValue(row.id, property.id, { textValue: event.target.value })
      }
    />
  );
}

export function DatabaseGrid({
  database,
  visibleProperties,
  onSetValue,
  onSetRelation,
  onUpdateRowTitle,
  onEditProperty,
  onOpenRow,
  onAddSelectOption,
}: {
  database: DatabaseData;
  visibleProperties: DatabaseProperty[];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onSetRelation: ReturnType<typeof useDatabase>["setRelation"];
  onUpdateRowTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onEditProperty: (property: DatabaseProperty) => void;
  onOpenRow: (rowId: Id<"documents">) => void;
  onAddSelectOption: ReturnType<typeof useDatabase>["addSelectOption"];
}) {
  const [newOptionTarget, setNewOptionTarget] = useState<{
    property: DatabaseProperty;
    row: DatabaseRow;
  } | null>(null);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionColor, setNewOptionColor] =
    useState<SelectOptionColor>("slate");
  const [isAddingOption, setIsAddingOption] = useState(false);

  const addOption = async () => {
    if (!newOptionTarget || !newOptionName.trim()) return;
    setIsAddingOption(true);
    const optionId = await onAddSelectOption({
      propertyId: newOptionTarget.property.id,
      name: newOptionName.trim(),
      color: newOptionColor,
    });
    if (optionId) {
      await onSetValue(newOptionTarget.row.id, newOptionTarget.property.id, {
        optionIds: [optionId],
      });
      setNewOptionTarget(null);
      setNewOptionName("");
      setNewOptionColor("slate");
    }
    setIsAddingOption(false);
  };
  const handleExportCsv = () => {
    const csv = exportDatabaseToCsv(database);
    downloadCsv(`${database.dataSource.name}.csv`, csv);
  };

  const columns = useMemo(
    () => [
      ...visibleProperties.map((property) =>
        columnHelper.display({
          id: property.id,
          header: () => (
            <button
              type="button"
              className="hover:text-foreground group/property-header flex w-full items-center justify-between gap-2 text-left"
              aria-label={`Edit ${property.name} property`}
              onClick={() => onEditProperty(property)}
            >
              <span className="truncate">{property.name}</span>
              <Settings2 className="size-3.5 opacity-0 group-hover/property-header:opacity-100" />
            </button>
          ),
          cell: ({ row }) =>
            property.type === "title" ? (
              <div className="group/title-cell flex min-w-0 items-center gap-1">
                <Input
                  aria-label={`Name for ${row.original.title}`}
                  defaultValue={row.original.title}
                  className="h-8 min-w-0 flex-1 border-0 bg-transparent text-xs font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[#2383E2]"
                  onBlur={(event) =>
                    onUpdateRowTitle(row.original.id, event.target.value)
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-[10px] opacity-0 transition-opacity group-hover/title-cell:opacity-100 focus-visible:opacity-100"
                  onClick={() => onOpenRow(row.original.id)}
                  aria-label={`Open ${row.original.title}`}
                >
                  <ExternalLink className="size-3" /> Open
                </Button>
              </div>
            ) : (
              <DatabaseCell
                property={property}
                row={row.original}
                database={database}
                onSetValue={onSetValue}
                onSetRelation={onSetRelation}
                onRequestAddOption={(targetProperty, targetRow) =>
                  setNewOptionTarget({
                    property: targetProperty,
                    row: targetRow,
                  })
                }
              />
            ),
        }),
      ),
    ],
    [
      database,
      onEditProperty,
      onSetRelation,
      onSetValue,
      onUpdateRowTitle,
      onOpenRow,
      visibleProperties,
    ],
  );
  // TanStack Table owns a headless table instance; keep it scoped to this
  // component rather than passing its mutable methods into memoized children.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: database.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <>
      <div className="group relative my-2 w-full">
        <div className="border-border/40 w-full scrollbar-thin overflow-x-auto border-y">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead className="text-muted-foreground/70 border-border/40 bg-muted/20 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={cn(
                      "border-border/30 border-r px-3 py-2 text-left font-medium whitespace-nowrap last:border-r-0",
                      index === 0 ? "min-w-72" : "min-w-36",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="group hover:bg-muted/30 border-border/30 border-b transition-colors"
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "border-border/30 border-r p-1 whitespace-nowrap last:border-r-0",
                      index === 0 ? "min-w-72" : "min-w-36",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!table.getRowModel().rows.length ? (
              <tr>
                <td
                  colSpan={table.getAllLeafColumns().length}
                  className="text-muted-foreground/60 px-4 py-8 text-center text-xs"
                >
                  Add the first page to this database.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 z-10 gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={handleExportCsv}
          aria-label={`Export ${database.dataSource.name} as CSV`}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>
      <Dialog
        open={newOptionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setNewOptionTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add new{" "}
              {newOptionTarget?.property.type === "status"
                ? "status"
                : "option"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable value for {newOptionTarget?.property.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-database-option-name">Name</Label>
              <Input
                id="new-database-option-name"
                value={newOptionName}
                onChange={(event) => setNewOptionName(event.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SELECT_OPTION_COLORS) as SelectOptionColor[]).map(
                  (color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      aria-pressed={newOptionColor === color}
                      className={cn(
                        "size-7 rounded-full border-2",
                        selectOptionColor(color).pill,
                        newOptionColor === color
                          ? "border-foreground"
                          : "border-transparent",
                      )}
                      onClick={() => setNewOptionColor(color)}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOptionTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void addOption()}
              disabled={isAddingOption || !newOptionName.trim()}
            >
              {isAddingOption ? "Adding…" : "Add option"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
