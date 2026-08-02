"use client";

import { useMemo, useState } from "react";
import { Check, Database, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import type { ContentSource } from "./useContentApi";

type DatabaseAccessPickerProps = {
  sources: ContentSource[];
  selected: Id<"dataSources">[];
  onChange: (selected: Id<"dataSources">[]) => void;
  compact?: boolean;
};

export function DatabaseAccessPicker({
  sources,
  selected,
  onChange,
  compact = false,
}: DatabaseAccessPickerProps) {
  const [search, setSearch] = useState("");
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const visibleSources = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? sources.filter((source) =>
          source.name.toLocaleLowerCase().includes(query),
        )
      : sources;
  }, [search, sources]);

  const toggle = (id: Id<"dataSources">) => {
    onChange(
      selectedIds.has(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id],
    );
  };

  if (sources.length === 0) {
    return (
      <div className="border-border/70 bg-muted/20 rounded-xl border border-dashed px-4 py-6 text-center">
        <Database className="text-muted-foreground mx-auto size-5" />
        <p className="mt-2 text-sm font-medium">No databases yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Create a database in this workspace, then it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-3.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a database…"
            className="border-border/60 h-8 rounded-md bg-transparent pl-8 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-[#2383E2]"
          />
        </div>
      </div>

      <div
        className={cn(
          "divide-y divide-border/20 flex flex-col overflow-y-auto py-1",
          compact ? "max-h-44" : "max-h-60",
        )}
      >
        {visibleSources.map((source) => {
          const isSelected = selectedIds.has(source.id);
          return (
            <button
              key={source.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(source.id)}
              className={cn(
                "group flex w-full items-center justify-between gap-3 px-2 py-2 text-left transition-colors rounded-md",
                isSelected
                  ? "text-foreground bg-[#2383E2]/10 font-medium"
                  : "hover:bg-muted/40 text-foreground/90",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="bg-muted/60 text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded text-xs">
                  {source.icon || <Database className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {source.name || "Untitled database"}
                  </span>
                </span>
              </div>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-[#2383E2] bg-[#2383E2] text-white"
                    : "border-border/60 group-hover:border-foreground/40",
                )}
              >
                {isSelected ? (
                  <Check className="size-2.5" strokeWidth={3} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground pt-1 font-mono text-[11px]">
        {selected.length} of {sources.length} databases selected
      </p>
    </div>
  );
}
