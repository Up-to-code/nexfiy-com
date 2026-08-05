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
import { useI18n } from "@/lib/i18n/I18nProvider";

export function SyncBlockDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (targetPageId: Id<"documents">) => Promise<boolean>;
}) {
  const { t } = useI18n();
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
            <DialogTitle>{t("dialogs.syncTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.syncDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="synced-block-target">
              {t("dialogs.syncDestination")}
            </Label>
            <Select
              value={targetPageId}
              onValueChange={(value) =>
                setTargetPageId(value as Id<"documents">)
              }
            >
              <SelectTrigger id="synced-block-target">
                <SelectValue placeholder={t("dialogs.syncChoosePage")} />
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
              {t("dialogs.cancel")}
            </Button>
            <Button disabled={!targetPageId || isSaving}>
              {isSaving ? t("dialogs.syncCreating") : t("dialogs.syncCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
