"use client";

import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";

const EMPTY_COLUMN_ID = "__empty__";
const ROW_PREFIX = "database-row:";
const COLUMN_PREFIX = "database-column:";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;
type DatabaseRow = DatabaseData["rows"][number];

function PipelineCard({
  row,
  activeView,
  database,
  groupPropertyId,
}: {
  row: DatabaseRow;
  activeView: DatabaseData["views"][number] | undefined;
  database: DatabaseData;
  groupPropertyId: Id<"databaseProperties">;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${ROW_PREFIX}${row.id}`,
      data: { rowId: row.id },
    });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "bg-card text-card-foreground group relative rounded-lg border border-border/60 p-3 shadow-xs transition-all duration-150 hover:border-border hover:shadow-sm cursor-grab active:cursor-grabbing",
        isDragging && "z-20 opacity-60 shadow-lg ring-2 ring-primary/40",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{row.title || "Untitled"}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Link href={`/documents/${row.id}`} aria-label={`Open ${row.title}`}>
            <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
          </Link>
        </Button>
      </div>
      {activeView?.visiblePropertyIds
        .filter(
          (propertyId) =>
            propertyId !== groupPropertyId &&
            database.properties.find((property) => property.id === propertyId)
              ?.type !== "title",
        )
        .slice(0, 3)
        .map((propertyId) => {
          const property = database.properties.find(
            (candidate) => candidate.id === propertyId,
          );
          const value = row.values.find(
            (candidate) => candidate.propertyId === propertyId,
          );
          if (!property || !value) return null;
          const display =
            value.textValue ??
            value.numberValue ??
            (value.dateStart
              ? new Date(value.dateStart).toLocaleDateString()
              : undefined);
          return display !== undefined ? (
            <p
              key={propertyId}
              className="text-muted-foreground/80 mt-1.5 truncate text-[11px] font-normal"
            >
              <span className="text-muted-foreground/50 mr-1">{property.name}:</span>
              {String(display)}
            </p>
          ) : null;
        })}
    </article>
  );
}

function PipelineColumn({
  id,
  name,
  rows,
  activeView,
  database,
  groupPropertyId,
  onAddRow,
}: {
  id: string;
  name: string;
  rows: DatabaseRow[];
  activeView: DatabaseData["views"][number] | undefined;
  database: DatabaseData;
  groupPropertyId: Id<"databaseProperties">;
  onAddRow: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${COLUMN_PREFIX}${id}`,
    data: { optionId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 rounded-xl bg-transparent p-1 transition-colors",
        isOver && "bg-primary/5 ring-primary/20 ring-1 rounded-xl",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground/80">
        <span className="truncate">{name}</span>
        <span className="text-muted-foreground/60 font-mono text-[11px] font-normal">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <PipelineCard
            key={row.id}
            row={row}
            activeView={activeView}
            database={database}
            groupPropertyId={groupPropertyId}
          />
        ))}
        <button
          type="button"
          className="text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
          onClick={onAddRow}
        >
          <Plus className="size-3.5" /> New
        </button>
      </div>
    </div>
  );
}

export function DatabaseBoard({
  database,
  onSetValue,
  onAddRow,
}: {
  database: DatabaseData;
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onAddRow: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const activeView = database.views.find(
    (view) => view.id === database.activeViewId,
  );
  const groupProperty = database.properties.find(
    (property) => property.id === activeView?.groupPropertyId,
  );

  if (!groupProperty) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-10 text-center text-sm">
        Choose a status or select property to group this pipeline.
      </div>
    );
  }

  const options = database.options.filter(
    (option) => option.propertyId === groupProperty.id,
  );
  const columns = [
    { id: EMPTY_COLUMN_ID, name: "No status" },
    ...options.map((option) => ({ id: option.id, name: option.name })),
  ];
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const rowId = String(active.id).replace(ROW_PREFIX, "");
    const optionId = String(over.id).replace(COLUMN_PREFIX, "");
    if (!rowId || !String(over.id).startsWith(COLUMN_PREFIX)) return;
    void onSetValue(rowId as Id<"documents">, groupProperty.id, {
      optionIds:
        optionId === EMPTY_COLUMN_ID
          ? []
          : [optionId as Id<"databaseSelectOptions">],
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex min-h-80 gap-3 overflow-x-auto pb-4">
        {columns.map((column) => {
          const rows = database.rows.filter((row) => {
            const value = row.values.find(
              (candidate) => candidate.propertyId === groupProperty.id,
            );
            const selected = value?.optionIds?.[0];
            return column.id === EMPTY_COLUMN_ID
              ? !selected
              : selected === column.id;
          });
          return (
            <PipelineColumn
              key={column.id}
              id={column.id}
              name={column.name}
              rows={rows}
              activeView={activeView}
              database={database}
              groupPropertyId={groupProperty.id}
              onAddRow={onAddRow}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
