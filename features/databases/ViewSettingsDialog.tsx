"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import type { useDatabase } from "./useDatabase";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;
type DatabaseView = DatabaseData["views"][number];
type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_empty"
  | "is_not_empty";
type ViewFilter = {
  propertyId: Id<"databaseProperties">;
  operator: FilterOperator;
  value?: string;
};

function initialFilters(filterJson?: string): ViewFilter[] {
  if (!filterJson) return [];
  try {
    const value: unknown = JSON.parse(filterJson);
    return Array.isArray(value) ? (value as ViewFilter[]) : [];
  } catch {
    return [];
  }
}

const FILTER_LABELS: Record<FilterOperator, string> = {
  equals: "Is",
  not_equals: "Is not",
  contains: "Contains",
  is_empty: "Is empty",
  is_not_empty: "Is not empty",
};

export function ViewSettingsDialog({
  open,
  onOpenChange,
  database,
  view,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: DatabaseData;
  view: DatabaseView;
  onSave: ReturnType<typeof useDatabase>["updateView"];
}) {
  const [name, setName] = useState(view.name);
  const [visiblePropertyIds, setVisiblePropertyIds] = useState(view.visiblePropertyIds);
  const [sorts, setSorts] = useState(view.sorts);
  const [filters, setFilters] = useState<ViewFilter[]>(() =>
    initialFilters(view.filterJson),
  );
  const [groupPropertyId, setGroupPropertyId] = useState(view.groupPropertyId);
  const [datePropertyId, setDatePropertyId] = useState(view.datePropertyId);
  const [isSaving, setIsSaving] = useState(false);
  const groupProperties = database.properties.filter((property) =>
    ["status", "select"].includes(property.type),
  );
  const dateProperties = database.properties.filter(
    (property) => property.type === "date",
  );

  const save = async () => {
    setIsSaving(true);
    const saved = await onSave({
      viewId: view.id,
      name,
      visiblePropertyIds,
      sorts,
      filters,
      groupPropertyId,
      datePropertyId,
    });
    setIsSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure {view.name}</DialogTitle>
          <DialogDescription>
            These settings are saved for everyone who opens this database view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-2">
            <label className="text-sm font-medium" htmlFor="view-name">
              View name
            </label>
            <Input id="view-name" value={name} onChange={(event) => setName(event.target.value)} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Visible properties</h3>
            <div className="grid grid-cols-2 gap-2">
              {database.properties.map((property) => {
                const visible = visiblePropertyIds.includes(property.id);
                const required = property.type === "title";
                return (
                  <button
                    key={property.id}
                    type="button"
                    disabled={required}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
                      visible && "bg-muted",
                    )}
                    onClick={() =>
                      setVisiblePropertyIds((current) =>
                        visible
                          ? current.filter((id) => id !== property.id)
                          : [...current, property.id],
                      )
                    }
                  >
                    <span>{property.name}</span>
                    {visible ? <Check className="size-4" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Sorts</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!database.properties.length}
                onClick={() =>
                  setSorts((current) => [
                    ...current,
                    { propertyId: database.properties[0].id, direction: "asc" },
                  ])
                }
              >
                <Plus /> Add sort
              </Button>
            </div>
            {sorts.map((sort, index) => (
              <div key={`${sort.propertyId}-${index}`} className="flex gap-2">
                <Select
                  value={sort.propertyId}
                  onValueChange={(propertyId) =>
                    setSorts((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, propertyId: propertyId as Id<"databaseProperties"> }
                          : item,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {database.properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort.direction}
                  onValueChange={(direction) =>
                    setSorts((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, direction: direction as "asc" | "desc" }
                          : item,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setSorts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X />
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Filters</h3>
                <p className="text-muted-foreground text-xs">All filters must match.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!database.properties.length}
                onClick={() =>
                  setFilters((current) => [
                    ...current,
                    { propertyId: database.properties[0].id, operator: "contains", value: "" },
                  ])
                }
              >
                <Plus /> Add filter
              </Button>
            </div>
            {filters.map((filter, index) => {
              const needsValue = !["is_empty", "is_not_empty"].includes(filter.operator);
              return (
                <div key={`${filter.propertyId}-${index}`} className="grid grid-cols-[1fr_150px_1fr_auto] gap-2">
                  <Select
                    value={filter.propertyId}
                    onValueChange={(propertyId) =>
                      setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, propertyId: propertyId as Id<"databaseProperties"> } : item))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {database.properties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filter.operator}
                    onValueChange={(operator) =>
                      setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, operator: operator as FilterOperator } : item))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FILTER_LABELS) as FilterOperator[]).map((operator) => <SelectItem key={operator} value={operator}>{FILTER_LABELS[operator]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={filter.value ?? ""}
                    disabled={!needsValue}
                    placeholder={needsValue ? "Value" : "No value needed"}
                    onChange={(event) => setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setFilters((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X /></Button>
                </div>
              );
            })}
          </section>

          {view.type === "board" ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Group pipeline by</h3>
              <Select value={groupPropertyId} onValueChange={(id) => setGroupPropertyId(id as Id<"databaseProperties">)}>
                <SelectTrigger><SelectValue placeholder="Choose a status property" /></SelectTrigger>
                <SelectContent>{groupProperties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}</SelectContent>
              </Select>
            </section>
          ) : null}

          {["calendar", "timeline"].includes(view.type) ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Date property</h3>
              <Select value={datePropertyId} onValueChange={(id) => setDatePropertyId(id as Id<"databaseProperties">)}>
                <SelectTrigger><SelectValue placeholder="Choose a date property" /></SelectTrigger>
                <SelectContent>{dateProperties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}</SelectContent>
              </Select>
            </section>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={isSaving || !name.trim()}>{isSaving ? "Saving…" : "Save view"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
