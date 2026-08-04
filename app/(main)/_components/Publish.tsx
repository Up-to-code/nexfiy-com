"use client";

import { Doc } from "@/convex/_generated/dataModel";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useOrigin } from "@/hooks/useOrigin";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Copy, Divide, Globe } from "lucide-react";
import posthog from "posthog-js";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface PublishProps {
  initialData: Doc<"documents">;
}

export const Publish = ({ initialData }: PublishProps) => {
  const origin = useOrigin();
  const update = useMutation(api.documents.update);
  const { t } = useI18n();

  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const url = `${origin}/preview/${initialData._id}`;

  const onPublish = () => {
    setIsSubmitting(true);

    const promise = update({
      id: initialData._id,
      isPublished: true,
    }).finally(() => setIsSubmitting(false));

    void promise.then(() => {
      posthog.capture("document_published");
    }).catch(() => undefined);

    toast.promise(promise, {
      loading: t("app.publishing"),
      success: t("app.notePublished"),
      error: t("app.publishFailed"),
    });
  };

  const onUnpublish = () => {
    setIsSubmitting(true);

    const promise = update({
      id: initialData._id,
      isPublished: false,
    }).finally(() => setIsSubmitting(false));

    void promise.then(() => {
      posthog.capture("document_unpublished");
    }).catch(() => undefined);

    toast.promise(promise, {
      loading: t("app.unpublishing"),
      success: t("app.noteUnpublished"),
      error: t("app.unpublishFailed"),
    });
  };

  const onCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label={initialData.isPublished ? t("app.published") : t("app.publish")}
          title={initialData.isPublished ? t("app.published") : ""}
        >
          {initialData.isPublished ? (
            <Globe className="h-4 w-4 text-sky-500" />
          ) : (
            <span className="text-sm">{t("app.publish")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" alignOffset={8} forceMount>
        {initialData.isPublished ? (
          <div className="space-y-4">
            <div className="flex items-center gap-x-2">
              <Globe className="h-4 w-4 animate-pulse text-sky-500" />
              <p className="text-xs font-medium text-sky-500">
                {t("app.liveOnWeb")}
              </p>
            </div>
            <div className="flex items-center">
              <input
                value={url}
                className="bg-muted h-8 flex-1 rounded-l-md border px-2 text-xs"
                disabled
              />
              <Button
                onClick={onCopy}
                disabled={copied}
                className="h-8 rounded-l-none"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={isSubmitting}
              onClick={onUnpublish}
            >
              {t("app.unpublish")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Globe className="text-muted-foreground mb-2 h-8 w-8" />
            <p>{t("app.publishedNote")}</p>
            <span className="text-muted-foreground mb-4 text-xs">
              {t("app.shareWork")}
            </span>
            <Button
              disabled={isSubmitting}
              onClick={onPublish}
              className="w-full text-xs"
              size="sm"
            >
              {t("app.publish")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
