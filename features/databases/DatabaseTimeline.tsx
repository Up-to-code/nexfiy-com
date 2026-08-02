"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ExternalLink, History } from "lucide-react";

import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;
type DatabaseRow = DatabaseData["rows"][number];
const DAY = 86_400_000;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function rowStatus(database: DatabaseData, row: DatabaseRow) {
  const statusProperty = database.properties.find(
    (property) => property.type === "status",
  );
  if (!statusProperty) return undefined;
  const optionId = row.values.find(
    (value) => value.propertyId === statusProperty.id,
  )?.optionIds?.[0];
  return database.options.find((option) => option.id === optionId)?.name;
}

export function DatabaseTimeline({ database }: { database: DatabaseData }) {
  const [now] = useState(() => Date.now());
  const activeView = database.views.find(
    (view) => view.id === database.activeViewId,
  );
  const dateProperty =
    database.properties.find(
      (property) => property.id === activeView?.datePropertyId,
    ) ?? database.properties.find((property) => property.type === "date");

  const timelineRows = useMemo(
    () =>
      database.rows
        .map((row) => {
          const value = dateProperty
            ? row.values.find(
                (candidate) => candidate.propertyId === dateProperty.id,
              )
            : undefined;
          const isScheduled = value?.dateStart !== undefined;
          const start = value?.dateStart ?? row.updatedAt ?? now;
          return {
            row,
            isScheduled,
            start,
            end: isScheduled ? (value.dateEnd ?? start + DAY) : start,
            status: rowStatus(database, row),
          };
        })
        .sort((left, right) => left.start - right.start),
    [database, dateProperty, now],
  );

  const earliestEvent = timelineRows.length
    ? Math.min(...timelineRows.map((item) => item.start))
    : now;
  const latestEvent = timelineRows.length
    ? Math.max(...timelineRows.map((item) => item.end))
    : now;
  const earliest = Math.min(earliestEvent - DAY, now - 3 * DAY);
  const latest = Math.max(latestEvent + DAY, now + 10 * DAY);
  const range = Math.max(14 * DAY, latest - earliest);
  const ticks = Array.from(
    { length: 8 },
    (_, index) => earliest + (range * index) / 7,
  );

  return (
    <section className="space-y-3" aria-label="Automation timeline">
      <div className="bg-muted/30 flex flex-wrap items-start justify-between gap-3 rounded-md px-3 py-2.5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" /> Automation timeline
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Scheduled pages use {dateProperty?.name ?? "a date property"};
            undated pages stay visible at their latest activity.
          </p>
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-primary size-2 rounded-full" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-muted-foreground size-2 rounded-full" /> Latest
            activity
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <div className="min-w-4xl">
          <div className="grid grid-cols-[240px_1fr] border-b">
            <div className="bg-muted/40 border-r px-3 py-2 text-sm font-medium">
              Page activity
            </div>
            <div className="bg-muted/40 grid grid-cols-8">
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="text-muted-foreground border-r px-2 py-2 text-center text-xs last:border-0"
                >
                  {new Date(tick).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              ))}
            </div>
          </div>

          {timelineRows.map(({ row, start, end, isScheduled, status }) => {
            const left = Math.min(
              98,
              Math.max(0, ((start - earliest) / range) * 100),
            );
            const width = isScheduled
              ? Math.max(2.5, ((end - start) / range) * 100)
              : 0;
            return (
              <div
                key={row.id}
                className="grid grid-cols-[240px_1fr] border-b last:border-0"
              >
                <Link
                  href={`/documents/${row.id}`}
                  className="group flex min-h-14 items-center justify-between gap-2 border-r px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {row.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      {isScheduled ? (
                        <CalendarClock className="size-3" />
                      ) : (
                        <History className="size-3" />
                      )}
                      {isScheduled ? formatDate(start) : "Latest activity"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {status ? (
                      <span className="bg-secondary text-secondary-foreground max-w-24 truncate rounded-full px-2 py-0.5 text-xs">
                        {status}
                      </span>
                    ) : null}
                    <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100" />
                  </span>
                </Link>
                <div className="relative min-h-14 bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(12.5%-1px),var(--border)_calc(12.5%-1px),var(--border)_12.5%)]">
                  {isScheduled ? (
                    <div
                      className="bg-primary text-primary-foreground absolute top-3 h-8 min-w-7 overflow-hidden rounded px-2 py-1.5 text-xs shadow-sm"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${row.title}: ${formatDate(start)}`}
                    >
                      {formatDate(start)}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "bg-muted-foreground ring-background absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4",
                      )}
                      style={{ left: `${left}%` }}
                      title={`${row.title}: latest activity ${formatDate(start)}`}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {!timelineRows.length ? (
            <p className="text-muted-foreground p-10 text-center text-sm">
              Add a page to begin the automation timeline.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
