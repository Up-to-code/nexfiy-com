"use client";

import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface BannerProps {
  documentId: Id<"documents">;
}

export const Banner = ({ documentId }: BannerProps) => {
  const router = useRouter();
  const { t } = useI18n();
  const remove = useMutation(api.documents.remove);
  const restore = useMutation(api.documents.restore);

  const onRemove = () => {
    const promise = remove({ id: documentId });

    toast.promise(promise, {
      loading: t("app.deletingNote"),
      success: t("app.noteDeleted"),
      error: t("app.deleteFailed"),
    });

    router.push("/documents");
  };

  const onRestore = () => {
    const promise = restore({ id: documentId });

    toast.promise(promise, {
      loading: t("app.restoringNote"),
      success: t("app.noteRestored"),
      error: t("app.restoreFailed"),
    });
  };

  return (
    <div className="flex w-full items-center justify-center gap-x-2 bg-rose-500 p-2 text-center text-sm text-white">
      <p>
        {t("app.thisPageIsInThe")} <span className="font-bold">{t("app.trashPeriod")}</span>
      </p>
      <Button
        size="sm"
        onClick={onRestore}
        variant="outline"
        className="h-auto border-white bg-transparent p-1 px-2 font-normal text-white transition hover:bg-white hover:text-rose-500"
      >
        {t("app.restorePage")}
      </Button>
      <ConfirmModal onConfirm={onRemove}>
        <Button
          size="sm"
          variant="outline"
          className="h-auto border-white bg-transparent p-1 px-2 font-normal text-white transition hover:bg-white hover:text-rose-500"
        >
          {t("app.deleteForever")}
        </Button>
      </ConfirmModal>
    </div>
  );
};
