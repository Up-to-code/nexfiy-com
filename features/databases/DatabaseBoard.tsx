"use client";

import { useState } from "react";

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
import { ExternalLink, MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";
import { SELECT_OPTION_COLORS, selectOptionColor } from "./selectOptionColors";

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
  onOpenRow,
}: {
  row: DatabaseRow;
  activeView: DatabaseData["views"][number] | undefined;
  database: DatabaseData;
  groupPropertyId: Id<"databaseProperties">;
  onOpenRow: (rowId: Id<"documents">) => void;
}) {
  const { t } = useI18n();
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
        <button
          type="button"
          className="text-left text-sm font-medium leading-snug hover:underline"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onOpenRow(row.id)}
        >
          {row.title || t("common.untitled")}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onOpenRow(row.id)}
        >
          <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
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
  color,
  rows,
  activeView,
  database,
  groupPropertyId,
  onAddRow,
  onOpenRow,
  onUpdateOption,
  onRemoveOption,
  onHideOption,
}: {
  id: string;
  name: string;
  color: string;
  rows: DatabaseRow[];
  activeView: DatabaseData["views"][number] | undefined;
  database: DatabaseData;
  groupPropertyId: Id<"databaseProperties">;
  onAddRow: () => void;
  onOpenRow: (rowId: Id<"documents">) => void;
  onUpdateOption?: (input: {
    optionId: Id<"databaseSelectOptions">;
    name?: string;
    color?: string;
  }) => Promise<boolean>;
  onRemoveOption?: (optionId: Id<"databaseSelectOptions">) => Promise<boolean>;
  onHideOption?: (optionId: Id<"databaseSelectOptions">) => void;
}) {
  const { t } = useI18n();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: `${COLUMN_PREFIX}${id}`,
    data: { optionId: id },
  });

  return (
    <>
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 rounded-xl border p-1 transition-colors",
        selectOptionColor(color).column,
        isOver && "bg-primary/5 ring-primary/20 ring-1 rounded-xl",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground/80">
        <span className="truncate">{name}</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground/60 font-mono text-[11px] font-normal">{rows.length}</span>
          {id !== EMPTY_COLUMN_ID && onUpdateOption && onRemoveOption ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="size-6">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem
                  onSelect={() => {
                    setRenameDraft(name);
                    setIsRenameOpen(true);
                  }}
                  >
                    {t("dialogs.boardRenameGroup")}
                  </DropdownMenuItem>
                  <DropdownMenuLabel>{t("dialogs.boardColor")}</DropdownMenuLabel>
                {Object.keys(SELECT_OPTION_COLORS).map((optionColor) => (
                  <DropdownMenuItem
                    key={optionColor}
                    onSelect={() => void onUpdateOption({
                      optionId: id as Id<"databaseSelectOptions">,
                      color: optionColor,
                    })}
                  >
                    <span className={cn("mr-2 size-3 rounded-full", selectOptionColor(optionColor).pill)} />
                    <span className="capitalize">{optionColor}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {onHideOption ? (
                  <DropdownMenuItem
                    onSelect={() =>
                      onHideOption(id as Id<"databaseSelectOptions">)
                    }
                  >
                    Hide group
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setIsDeleteOpen(true)}
                >
                  Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <PipelineCard
            key={row.id}
            row={row}
            activeView={activeView}
            database={database}
            groupPropertyId={groupPropertyId}
            onOpenRow={onOpenRow}
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
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dialogs.boardRenameGroup")}</DialogTitle>
            <DialogDescription>
              This name updates everywhere this option is shown.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            maxLength={80}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameOpen(false)}>
              {t("dialogs.cancel")}
            </Button>
            <Button
              disabled={!renameDraft.trim()}
              onClick={async () => {
                const saved = await onUpdateOption?.({
                  optionId: id as Id<"databaseSelectOptions">,
                  name: renameDraft.trim(),
                });
                if (saved) setIsRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dialogs.boardDeleteGroup", { name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Rows using this group will move to No status. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogs.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                void onRemoveOption?.(
                  id as Id<"databaseSelectOptions">,
                )
              }
            >
              Delete group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function DatabaseBoard({
  database,
  onSetValue,
  onAddRow,
  onOpenRow,
  onUpdateOption,
  onRemoveOption,
  onUpdateView,
}: {
  database: DatabaseData;
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onAddRow: (optionId?: Id<"databaseSelectOptions">) => void;
  onOpenRow: (rowId: Id<"documents">) => void;
  onUpdateOption: ReturnType<typeof useDatabase>["updateSelectOption"];
  onRemoveOption: ReturnType<typeof useDatabase>["removeSelectOption"];
  onUpdateView: ReturnType<typeof useDatabase>["updateView"];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const activeView = database.views.find(
    (view) => view.id === database.activeViewId,
  );
  const { t } = useI18n();
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

  const hiddenOptionIds = activeView?.hiddenOptionIds ?? [];
  const options = database.options.filter(
    (option) =>
      option.propertyId === groupProperty.id &&
      !hiddenOptionIds.includes(option.id),
  );
  const columns = [
    { id: EMPTY_COLUMN_ID, name: t("dialogs.boardNoStatus"), color: "slate" },
    ...options.map((option) => ({
      id: option.id,
      name: option.name,
      color: option.color,
    })),
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
              color={activeView?.colorColumns === false ? "slate" : column.color}
              rows={rows}
              activeView={activeView}
              database={database}
              groupPropertyId={groupProperty.id}
              onAddRow={() =>
                onAddRow(
                  column.id === EMPTY_COLUMN_ID
                    ? undefined
                    : (column.id as Id<"databaseSelectOptions">),
                )
              }
              onOpenRow={onOpenRow}
              onUpdateOption={onUpdateOption}
              onRemoveOption={onRemoveOption}
              onHideOption={(optionId) =>
                activeView &&
                void onUpdateView({
                  viewId: activeView.id,
                  hiddenOptionIds: [...hiddenOptionIds, optionId],
                })
              }
            />
          );
        })}
      </div>
    </DndContext>
  );
}
