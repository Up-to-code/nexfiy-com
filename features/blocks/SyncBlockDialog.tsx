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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function SyncBlockDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (targetPageId: Id<"documents">) => Promise<boolean>;
}) {
  const pages = useQuery(api.syncedBlocks.listTargetPages);
  const [targetPageId, setTargetPageId] = useState<Id<"documents">>();
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetPageId) return;
    setIsSaving(true);
    const created = await onSelect(targetPageId);
    setIsSaving(false);
    if (!created) return;
    setTargetPageId(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Sync this block to another page</DialogTitle>
            <DialogDescription>
              The destination renders the same canonical content. Editing either
              view updates every reference in realtime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="synced-block-target">Destination page</Label>
            <Select
              value={targetPageId}
              onValueChange={(value) =>
                setTargetPageId(value as Id<"documents">)
              }
            >
              <SelectTrigger id="synced-block-target">
                <SelectValue placeholder="Choose a page" />
              </SelectTrigger>
              <SelectContent>
                {pages?.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.icon ? `${page.icon} ` : ""}
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={!targetPageId || isSaving}>
              {isSaving ? "Creating…" : "Create synced reference"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
