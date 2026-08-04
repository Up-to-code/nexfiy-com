"use client";

import { ActionTooltip } from "@/components/action-tooltip";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { deleteUploadedFiles, getDocumentUrls } from "@/lib/uploadthing";
import { logger } from "@/lib/logger";
import { useMutation, useQuery } from "convex/react";
import { Coffee, Search, Trash, Trash2, Undo } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const TrashBox = () => {
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();

  const documents = useQuery(api.documents.getTrash);
  const restore = useMutation(api.documents.restore);
  const remove = useMutation(api.documents.remove);
  const removeAll = useMutation(api.documents.removeAll);

  const [search, setSearch] = useState("");

  const filteredDocuments = documents?.filter((document) => {
    return document.title.toLowerCase().includes(search.toLowerCase());
  });

  const onClick = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const onRestore = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    documentId: Id<"documents">,
  ) => {
    event.stopPropagation();
    const promise = restore({ id: documentId });

    void promise.then(() => {
      posthog.capture("document_restored");
    }).catch(() => undefined);

    toast.promise(promise, {
      loading: t("app.restoringNote"),
      success: t("app.noteRestored"),
      error: t("app.restoreFailed"),
    });
  };

  const deleteStoredFiles = async (urls: string[]) => {
    try {
      await deleteUploadedFiles(urls);
    } catch (error) {
      logger.error("Failed to delete stored document files", error);
    }
  };

  const onRemove = (documentId: Id<"documents">) => {
    const document = documents?.find((d) => d._id === documentId);
    if (document) {
      void deleteStoredFiles(getDocumentUrls(document));
    }

    const promise = remove({ id: documentId });

    void promise.then(() => {
      posthog.capture("document_deleted_permanently");
    }).catch(() => undefined);

    toast.promise(promise, {
      loading: t("app.deletingNote"),
      success: t("app.noteDeleted"),
      error: t("app.deleteFailed"),
    });

    if (params.documentId === documentId) {
      router.push("/documents");
    }
  };

  const onEmptyTrash = () => {
    if (documents) {
      const allUrls = documents.flatMap(getDocumentUrls);
      void deleteStoredFiles(allUrls);
    }

    const promise = removeAll();

    void promise.then(() => {
      posthog.capture("trash_emptied");
    }).catch(() => undefined);

    toast.promise(promise, {
      loading: t("app.emptyingTrash"),
      success: t("app.trashEmptied"),
      error: t("app.emptyTrashFailed"),
    });

    if (params.documentId) {
      const isCurrentDocInTrash = documents?.some(
        (doc) => doc._id === params.documentId,
      );
      if (isCurrentDocInTrash) {
        router.push("/documents");
      }
    }
  };

  if (documents === undefined) {
    return (
      <div
        className="space-y-2 p-3"
        aria-busy="true"
        aria-label={t("app.trash")}
      >
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-7 w-2/3" />
      </div>
    );
  }

  return (
    <section className="text-sm">
      <div className="flex items-center gap-x-1 p-2">
        <Search className="h-4 w-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-secondary h-7 px-2 focus-visible:ring-transparent"
          placeholder={t("app.filterByTitle")}
          aria-label={t("app.filterByTitle")}
        />
        {documents.length > 0 && (
          <ConfirmModal onConfirm={onEmptyTrash}>
            <div>
              <ActionTooltip label={t("app.emptyTrash")}>
                <div
                  role="button"
                  className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                  <Trash2 className="size-4 text-rose-500" />
                </div>
              </ActionTooltip>
            </div>
          </ConfirmModal>
        )}
      </div>

      <div className="mt-2 px-1 pb-1">
        {documents.length === 0 ? (
          <p className="text-muted-foreground pb-2 text-center text-xs">
            {t("app.trashEmpty")}
            <Coffee className="mb-1 ml-1 inline-block size-4" />
          </p>
        ) : (
          filteredDocuments?.length === 0 && (
            <p className="text-muted-foreground pb-2 text-center text-xs">
              {t("app.noDocumentsFound")}
            </p>
          )
        )}
        <div className="max-h-[50vh] overflow-y-auto">
          {filteredDocuments?.map((document) => (
            <div
              key={document._id}
              role="button"
              onClick={() => onClick(document._id)}
              className="text-primary hover:bg-primary/5 flex w-full items-center justify-between rounded-sm text-sm"
              aria-label={t("app.document")}
            >
              <span className="truncate pl-2">{document.title}</span>
              <div className="flex items-center">
                <ActionTooltip label={t("app.restorePage")}>
                  <button
                    onClick={(e) => onRestore(e, document._id)}
                    className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    aria-label={t("app.restorePage")}
                  >
                    <Undo className="text-muted-foreground h-4 w-4" />
                  </button>
                </ActionTooltip>
                <ConfirmModal onConfirm={() => onRemove(document._id)}>
                  <div>
                    <ActionTooltip label={t("app.deleteForever")}>
                      <button
                        className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                        aria-label={t("app.deleteForever")}
                      >
                        <Trash className="text-muted-foreground h-4 w-4" />
                      </button>
                    </ActionTooltip>
                  </div>
                </ConfirmModal>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
