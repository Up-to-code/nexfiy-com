"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Layers3, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";
import posthog from "posthog-js";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function TemplateGalleryDialog({
  open,
  onOpenChange,
  parentDocument,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentDocument?: Id<"documents">;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const templates = useQuery(api.pageTemplates.list);
  const instantiate = useMutation(api.pageTemplates.instantiate);
  const [creatingTemplateId, setCreatingTemplateId] =
    useState<Id<"pageTemplates">>();

  const instantiateTemplate = async (templateId: Id<"pageTemplates">) => {
    setCreatingTemplateId(templateId);
    try {
      const created = await instantiate({ templateId, parentDocument });
      posthog.capture("template_instantiated");
      onOpenChange(false);
      toast.success(t("dialogs.templateAdded"));
      router.push(`/documents/${created.rootDocumentId}`);
    } catch (error) {
      logger.error("Failed to instantiate page template", error);
      toast.error(t("dialogs.templateFailed"));
    } finally {
      setCreatingTemplateId(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dialogs.templateTitle")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.templateDescription")}
          </DialogDescription>
        </DialogHeader>
        {templates === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : templates.length ? (
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
            {templates.map((template) => (
              <article
                key={template.id}
                className="flex min-h-28 flex-col justify-between rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md text-lg">
                    {template.icon ?? <Layers3 className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{template.name}</h3>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {template.description ??
                        t("dialogs.templateStats", {
                          pageCount: String(template.pageCount),
                          blockCount: String(template.blockCount),
                        })}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 self-end"
                  size="sm"
                  disabled={Boolean(creatingTemplateId)}
                  onClick={() => instantiateTemplate(template.id)}
                >
                  {creatingTemplateId === template.id ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  {t("dialogs.templateUse")}
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            {t("dialogs.templateEmpty")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
