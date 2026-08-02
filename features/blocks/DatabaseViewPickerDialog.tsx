"use client";

import { useState } from "react";
import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function DatabaseViewPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: {
    dataSourceId: Id<"dataSources">;
    viewId: Id<"databaseViews">;
  }) => Promise<unknown>;
}) {
  const databases = useQuery(api.databases.listAvailable);
  const [sourceId, setSourceId] = useState<Id<"dataSources">>();
  const [viewId, setViewId] = useState<Id<"databaseViews">>();
  const [isAdding, setIsAdding] = useState(false);
  const selectedSource = databases?.find((source) => source.id === sourceId);

  const add = async () => {
    if (!sourceId || !viewId) return;
    setIsAdding(true);
    const result = await onSelect({ dataSourceId: sourceId, viewId });
    setIsAdding(false);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Embed a database view</DialogTitle>
          <DialogDescription>
            This block stays connected to the original data source and saved view.
          </DialogDescription>
        </DialogHeader>
        {databases === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : databases.length ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Database</label>
              <Select
                value={sourceId}
                onValueChange={(id) => {
                  const nextSource = databases.find((source) => source.id === id);
                  setSourceId(id as Id<"dataSources">);
                  setViewId(nextSource?.views[0]?.id);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choose a database" /></SelectTrigger>
                <SelectContent>
                  {databases.map((database) => (
                    <SelectItem key={database.id} value={database.id}>
                      {database.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Saved view</label>
              <Select
                value={viewId}
                disabled={!selectedSource}
                onValueChange={(id) => setViewId(id as Id<"databaseViews">)}
              >
                <SelectTrigger><SelectValue placeholder="Choose a view" /></SelectTrigger>
                <SelectContent>
                  {selectedSource?.views.map((view) => (
                    <SelectItem key={view.id} value={view.id}>
                      {view.name} · {view.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
            Create a database and saved view first.
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!sourceId || !viewId || isAdding} onClick={add}>
            {isAdding ? "Embedding…" : "Embed view"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
