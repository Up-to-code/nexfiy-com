"use client";

import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;
type DatabaseRow = DatabaseData["rows"][number];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const ROW_PREFIX = "calendar-row:";
const DAY_PREFIX = "calendar-day:";

function utcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function CalendarCard({
  row,
  draggable = true,
  onOpenRow,
}: {
  row: DatabaseRow;
  draggable?: boolean;
  onOpenRow: (rowId: Id<"documents">) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${ROW_PREFIX}${row.id}`,
      data: { rowId: row.id },
      disabled: !draggable,
    });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "group flex items-center justify-between rounded-md bg-[#2383E2]/12 border-l-3 border-[#2383E2] px-2 py-1 text-xs font-medium text-foreground transition-all hover:bg-[#2383E2]/20 cursor-grab active:cursor-grabbing",
        isDragging && "z-30 opacity-75 shadow-xl scale-105",
      )}
      {...listeners}
      {...attributes}
    >
      <button
        type="button"
        className="truncate pr-1 text-left"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onOpenRow(row.id)}
      >
        {row.title}
      </button>
      <button
        type="button"
        aria-label={`Open ${row.title}`}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onOpenRow(row.id)}
      >
        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </article>
  );
}

const TIME_PREFIX = "calendar-time:";

function CalendarDay({
  day,
  month,
  rows,
  readOnly,
  onAddRow,
  onOpenRow,
}: {
  day: Date;
  month: Date;
  rows: DatabaseRow[];
  readOnly: boolean;
  onAddRow?: (dateStart?: number) => void;
  onOpenRow: (rowId: Id<"documents">) => void;
}) {
  const timestamp = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  );
  const { isOver, setNodeRef } = useDroppable({
    id: `${DAY_PREFIX}${timestamp}`,
    data: { timestamp },
    disabled: readOnly,
  });
  const isCurrentMonth = day.getUTCMonth() === month.getUTCMonth();
  const today = new Date();
  const isToday =
    day.getUTCDate() === today.getDate() &&
    day.getUTCMonth() === today.getMonth() &&
    day.getUTCFullYear() === today.getFullYear();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/day relative min-h-28 space-y-1.5 border-r border-b border-border/30 p-2 transition-colors",
        !isCurrentMonth && "bg-muted/15 text-muted-foreground/50",
        isToday && "bg-[#2383E2]/5",
        isOver && "bg-[#2383E2]/15 ring-2 ring-[#2383E2] ring-inset",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-semibold",
            isToday
              ? "flex size-6 items-center justify-center rounded-full bg-[#2383E2] text-white shadow-xs"
              : isCurrentMonth
                ? "text-foreground"
                : "text-muted-foreground/50",
          )}
        >
          {day.getUTCDate()}
        </span>
        {!readOnly && onAddRow ? (
          <button
            type="button"
            onClick={() => onAddRow(timestamp)}
            className="opacity-0 group-hover/day:opacity-100 flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-[#2383E2] transition-opacity"
          >
            <Plus className="size-3" /> New
          </button>
        ) : null}
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <CalendarCard
            key={row.id}
            row={row}
            draggable={!readOnly}
            onOpenRow={onOpenRow}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarHourSlot({
  dayTimestamp,
  hour,
  rows,
  readOnly,
  onAddRow,
  onOpenRow,
}: {
  dayTimestamp: number;
  hour: number;
  rows: DatabaseRow[];
  readOnly: boolean;
  onAddRow?: (dateStart?: number) => void;
  onOpenRow: (rowId: Id<"documents">) => void;
}) {
  const slotTimestamp = dayTimestamp + hour * 3600 * 1000;
  const { isOver, setNodeRef } = useDroppable({
    id: `${TIME_PREFIX}${slotTimestamp}`,
    data: { timestamp: slotTimestamp },
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (e.target === e.currentTarget && !readOnly && onAddRow) {
          onAddRow(slotTimestamp);
        }
      }}
      className={cn(
        "group/slot relative p-1 min-h-14 transition-colors hover:bg-muted/20 border-b border-border/10",
        isOver && "bg-[#2383E2]/15 ring-2 ring-[#2383E2] ring-inset",
      )}
    >
      {rows.map((row) => (
        <CalendarCard
          key={row.id}
          row={row}
          draggable={!readOnly}
          onOpenRow={onOpenRow}
        />
      ))}
      {!rows.length && !readOnly && onAddRow ? (
        <button
          type="button"
          onClick={() => onAddRow(slotTimestamp)}
          className="opacity-0 group-hover/slot:opacity-100 absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#2383E2] bg-[#2383E2]/5 transition-opacity rounded"
        >
          + Add event at {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
        </button>
      ) : null}
    </div>
  );
}

export function DatabaseCalendar({
  database,
  onSetValue,
  onAddRow,
  onOpenRow,
  readOnly = false,
}: {
  database: DatabaseData;
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onAddRow?: (dateStart?: number) => void;
  onOpenRow: (rowId: Id<"documents">) => void;
  readOnly?: boolean;
}) {
  const now = new Date();
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "year">("month");
  const [currentDate, setCurrentDate] = useState(
    () => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const activeView = database.views.find(
    (view) => view.id === database.activeViewId,
  );
  const dateProperty =
    database.properties.find(
      (property) => property.id === activeView?.datePropertyId,
    ) ?? database.properties.find((property) => property.type === "date");

  // Calculate days according to viewMode
  const days = useMemo(() => {
    if (viewMode === "month") {
      const monthFirst = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
      const first = new Date(monthFirst);
      first.setUTCDate(1 - first.getUTCDay());
      return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(first);
        day.setUTCDate(first.getUTCDate() + index);
        return day;
      });
    }

    if (viewMode === "week") {
      const first = new Date(currentDate);
      first.setUTCDate(first.getUTCDate() - first.getUTCDay());
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(first);
        day.setUTCDate(first.getUTCDate() + index);
        return day;
      });
    }

    if (viewMode === "day") {
      return [new Date(currentDate)];
    }

    return [];
  }, [currentDate, viewMode]);

  if (!dateProperty) {
    return (
      <div className="bg-muted/25 space-y-3 rounded-md p-4">
        <div>
          <h3 className="text-sm font-semibold">Calendar notes</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            These pages do not need a date. Add a date property later when you
            want to schedule them on the calendar grid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {database.rows.map((row) => (
            <CalendarCard
              key={row.id}
              row={row}
              draggable={false}
              onOpenRow={onOpenRow}
            />
          ))}
          {!database.rows.length ? (
            <p className="text-muted-foreground text-sm">
              Add a page to start collecting calendar notes.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const rowsWithoutDate = database.rows.filter(
    (row) =>
      row.values.find((value) => value.propertyId === dateProperty.id)
        ?.dateStart === undefined,
  );

  const movePeriod = (offset: number) => {
    setCurrentDate((current) => {
      const d = new Date(current);
      if (viewMode === "month" || viewMode === "year") {
        d.setUTCMonth(d.getUTCMonth() + offset);
      } else if (viewMode === "week") {
        d.setUTCDate(d.getUTCDate() + offset * 7);
      } else if (viewMode === "day") {
        d.setUTCDate(d.getUTCDate() + offset);
      }
      return d;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const overIdStr = String(over.id);
    const rowId = String(active.id).replace(ROW_PREFIX, "");
    if (!rowId) return;

    let timestamp: number | null = null;
    if (overIdStr.startsWith(DAY_PREFIX)) {
      timestamp = Number(overIdStr.replace(DAY_PREFIX, ""));
    } else if (overIdStr.startsWith(TIME_PREFIX)) {
      timestamp = Number(overIdStr.replace(TIME_PREFIX, ""));
    }

    if (timestamp !== null && Number.isFinite(timestamp)) {
      void onSetValue(rowId as Id<"documents">, dateProperty.id, {
        dateStart: timestamp,
      });
    }
  };

  const getHeaderTitle = () => {
    if (viewMode === "year") {
      return currentDate.getUTCFullYear().toString();
    }
    if (viewMode === "day") {
      return currentDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    }
    return currentDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{getHeaderTitle()}</h3>

          <div className="flex items-center gap-3">
            {/* Mode Switcher Segmented Control */}
            <div className="inline-flex items-center rounded-md bg-muted/40 p-0.5 border border-border/40 text-xs">
              {(["month", "week", "day", "year"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-2.5 py-1 font-medium capitalize rounded transition-colors",
                    viewMode === mode
                      ? "bg-background text-[#2383E2] shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => movePeriod(-1)}
                aria-label="Previous period"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
                    ),
                  )
                }
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => movePeriod(1)}
                aria-label="Next period"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>

        {/* Year Grid View */}
        {viewMode === "year" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const monthDate = new Date(Date.UTC(currentDate.getUTCFullYear(), monthIdx, 1));
              const isCurrent = monthIdx === now.getUTCMonth() && currentDate.getUTCFullYear() === now.getUTCFullYear();
              const scheduledCount = database.rows.filter((row) => {
                const ts = row.values.find((v) => v.propertyId === dateProperty.id)?.dateStart;
                if (!ts) return false;
                const d = new Date(ts);
                return d.getUTCFullYear() === currentDate.getUTCFullYear() && d.getUTCMonth() === monthIdx;
              }).length;

              return (
                <button
                  key={monthIdx}
                  type="button"
                  onClick={() => {
                    setCurrentDate(monthDate);
                    setViewMode("month");
                  }}
                  className={cn(
                    "flex flex-col justify-between rounded-lg border p-3 text-left transition-colors hover:border-[#2383E2]/50 hover:bg-muted/30",
                    isCurrent && "border-[#2383E2] bg-[#2383E2]/5",
                  )}
                >
                  <span className="text-xs font-bold">
                    {monthDate.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}
                  </span>
                  <span className="text-muted-foreground mt-2 text-[11px]">
                    {scheduledCount} {scheduledCount === 1 ? "page" : "pages"} scheduled
                  </span>
                </button>
              );
            })}
          </div>
        ) : viewMode === "week" || viewMode === "day" ? (
          /* Hourly Schedule Timeline View for Week & Day (Notion / Apple Calendar style) */
          <div className="rounded-md border border-border/40 overflow-hidden bg-background">
            {/* Calendar Column Headers */}
            <div className="flex border-b border-border/40 bg-muted/20">
              <div className="w-16 shrink-0 border-r border-border/40 p-2 text-center text-[11px] font-semibold text-muted-foreground">
                Time
              </div>
              <div className={cn("grid flex-1 divide-x divide-border/40", viewMode === "day" ? "grid-cols-1" : "grid-cols-7")}>
                {days.map((day) => {
                  const today = new Date();
                  const isToday =
                    day.getUTCDate() === today.getDate() &&
                    day.getUTCMonth() === today.getMonth() &&
                    day.getUTCFullYear() === today.getFullYear();
                  return (
                    <div key={day.toISOString()} className="p-2 text-center">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        {DAY_NAMES[day.getUTCDay()]}
                      </p>
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                          isToday ? "bg-[#2383E2] text-white shadow-xs" : "text-foreground",
                        )}
                      >
                        {day.getUTCDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hourly Schedule Rows (8:00 AM - 8:00 PM) */}
            <div className="max-h-[460px] overflow-y-auto divide-y divide-border/20 scrollbar-thin">
              {HOURS.map((hour) => {
                const hourLabel = hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                return (
                  <div key={hour} className="flex min-h-14">
                    <div className="w-16 shrink-0 border-r border-border/30 p-2 text-right font-mono text-[10px] text-muted-foreground">
                      {hourLabel}
                    </div>
                    <div className={cn("grid flex-1 divide-x divide-border/20", viewMode === "day" ? "grid-cols-1" : "grid-cols-7")}>
                      {days.map((day) => {
                        const dayTimestamp = Date.UTC(
                          day.getUTCFullYear(),
                          day.getUTCMonth(),
                          day.getUTCDate(),
                        );
                        // Filter events scheduled for this day & hour
                        const matchingRows = database.rows.filter((row) => {
                          const ts = row.values.find((v) => v.propertyId === dateProperty.id)?.dateStart;
                          if (!ts) return false;
                          const d = new Date(ts);
                          return (
                            utcDay(ts) === dayTimestamp &&
                            (d.getUTCHours() === hour || (d.getUTCHours() === 0 && hour === 9))
                          );
                        });

                        return (
                          <CalendarHourSlot
                            key={`${dayTimestamp}-${hour}`}
                            dayTimestamp={dayTimestamp}
                            hour={hour}
                            rows={matchingRows}
                            readOnly={readOnly}
                            onAddRow={onAddRow}
                            onOpenRow={onOpenRow}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Month Box Grid View */
          <div className="grid grid-cols-7 overflow-hidden rounded-md border border-border/40">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="bg-muted/40 text-muted-foreground border-b px-2 py-1.5 text-center text-xs font-medium"
              >
                {name}
              </div>
            ))}
            {days.map((day) => {
              const dayTimestamp = Date.UTC(
                day.getUTCFullYear(),
                day.getUTCMonth(),
                day.getUTCDate(),
              );
              const rows = database.rows.filter((row) => {
                const timestamp = row.values.find(
                  (value) => value.propertyId === dateProperty.id,
                )?.dateStart;
                return (
                  timestamp !== undefined && utcDay(timestamp) === dayTimestamp
                );
              });
              return (
                <CalendarDay
                  key={dayTimestamp}
                  day={day}
                  month={currentDate}
                  rows={rows}
                  readOnly={readOnly}
                  onAddRow={onAddRow}
                  onOpenRow={onOpenRow}
                />
              );
            })}
          </div>
        )}

        {rowsWithoutDate.length ? (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-muted-foreground text-xs font-medium">No date</p>
            <div className="flex flex-wrap gap-2">
              {rowsWithoutDate.map((row) => (
                <CalendarCard
                  key={row.id}
                  row={row}
                  draggable={!readOnly}
                  onOpenRow={onOpenRow}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DndContext>
  );
}
