"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Check, ExternalLink, Settings2 } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";
import { DateTimePickerPopover } from "./DateTimePickerPopover";
import { selectOptionColor } from "./selectOptionColors";

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
}: {
  property: DatabaseProperty;
  row: DatabaseRow;
  database: DatabaseData;
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onSetRelation: ReturnType<typeof useDatabase>["setRelation"];
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
}: {
  database: DatabaseData;
  visibleProperties: DatabaseProperty[];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onSetRelation: ReturnType<typeof useDatabase>["setRelation"];
  onUpdateRowTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onEditProperty: (property: DatabaseProperty) => void;
  onOpenRow: (rowId: Id<"documents">) => void;
}) {
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
              <Input
                aria-label={`Name for ${row.original.title}`}
                defaultValue={row.original.title}
                className="h-8 w-full min-w-0 border-0 bg-transparent font-medium shadow-none text-xs focus-visible:ring-1 focus-visible:ring-[#2383E2]"
                onBlur={(event) =>
                  onUpdateRowTitle(row.original.id, event.target.value)
                }
              />
            ) : (
              <DatabaseCell
                property={property}
                row={row.original}
                database={database}
                onSetValue={onSetValue}
                onSetRelation={onSetRelation}
              />
            ),
        }),
      ),
      columnHelper.display({
        id: "open-page",
        header: () => null,
        cell: ({ row }) => (
          <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenRow(row.original.id)}
              aria-label={`Open ${row.original.title}`}
            >
              <ExternalLink className="size-3.5" />
          </Button>
        ),
      }),
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
    <div className="w-full overflow-x-auto border-y border-border/40 my-2 scrollbar-thin">
      <table className="min-w-full w-max border-collapse text-xs">
        <thead className="text-muted-foreground/70 border-b border-border/40 bg-muted/20">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={cn(
                    "border-r border-border/30 px-3 py-2 text-left font-medium whitespace-nowrap last:border-r-0",
                    index === 0 ? "min-w-72" : "min-w-36",
                    header.id === "open-page" && "w-10 min-w-10 px-1 text-center",
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
            <tr key={row.id} className="group hover:bg-muted/30 border-b border-border/30 transition-colors">
              {row.getVisibleCells().map((cell, index) => (
                <td
                  key={cell.id}
                  className={cn(
                    "border-r border-border/30 p-1 whitespace-nowrap last:border-r-0",
                    index === 0 ? "min-w-72" : "min-w-36",
                    cell.column.id === "open-page" && "w-10 min-w-10 text-center",
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
  );
}
