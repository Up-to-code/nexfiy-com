"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoverImage } from "@/hooks/useCoverImage";
import { SingleImageDropzone } from "@/components/single-image-dropzone";
import { useEffect, useState } from "react";
import { deleteUploadedFiles, uploadFile } from "@/lib/uploadthing";
import { logger } from "@/lib/logger";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";

const COVER_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#94a3b8",
  "#1e293b",
  "#ffffff",
  "linear-gradient(135deg, #f87171, #fb923c)",
  "linear-gradient(135deg, #fbbf24, #a3e635)",
  "linear-gradient(135deg, #34d399, #22d3ee)",
  "linear-gradient(135deg, #60a5fa, #a78bfa)",
  "linear-gradient(135deg, #f472b6, #fb923c)",
  "linear-gradient(135deg, #a78bfa, #60a5fa)",
  "linear-gradient(135deg, #1e293b, #475569)",
  "linear-gradient(135deg, #f87171, #a78bfa)",
];

export const CoverImageModal = () => {
  const { t } = useI18n();
  const params = useParams();

  const [file, setFile] = useState<File>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = useMutation(api.documents.update);
  const coverImage = useCoverImage();

  const [isDragging, setIsDragging] = useState(false);

  const onClose = () => {
    setFile(undefined);
    setIsSubmitting(false);
    coverImage.onClose();
  };

  const onChange = async (nextFile?: File) => {
    if (!nextFile) return;
    setIsSubmitting(true);
    setFile(nextFile);
    let uploadedUrl: string | undefined;
    try {
      uploadedUrl = await uploadFile("coverImage", nextFile);
      await update({
        id: params.documentId as Id<"documents">,
        coverImage: uploadedUrl,
      });
      if (coverImage.url) {
        await deleteUploadedFiles([coverImage.url]).catch((deleteError) => {
          logger.error("Failed to delete the previous cover image", deleteError);
        });
      }
      onClose();
    } catch (error) {
      logger.error("Failed to upload cover image", error);
      if (uploadedUrl) {
        await deleteUploadedFiles([uploadedUrl]).catch((cleanupError) => {
          logger.error("Failed to clean up uploaded cover image", cleanupError);
        });
      }
      setIsSubmitting(false);
      toast.error(
        error instanceof Error ? error.message : t("dialogs.coverUploadFailed"),
      );
    }
  };

  useEffect(() => {
    if (!coverImage.isOpen) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files?.[0]) {
        if (!files[0].type.startsWith("image/")) {
          toast.error(t("dialogs.coverOnlyImages"));
          return;
        }
        await onChange(files[0]);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [coverImage.isOpen, onChange, t]);

  const onSelectColor = async (color: string) => {
    try {
      await update({
        id: params.documentId as Id<"documents">,
        coverImage: color,
      });
      if (coverImage.url) {
        await deleteUploadedFiles([coverImage.url]).catch((deleteError) => {
          logger.error(
            "Failed to delete the previous cover image",
            deleteError,
          );
        });
      }
      onClose();
    } catch (error) {
      logger.error("Failed to change cover color", error);
      toast.error(t("dialogs.coverChangeFailed"));
    }
  };

  return (
    <Dialog open={coverImage.isOpen} onOpenChange={coverImage.onClose}>
      <DialogTitle>
        <span className="sr-only">{t("dialogs.coverSrTitle")}</span>
      </DialogTitle>
      <DialogContent className="dark:bg-dark">
        <DialogHeader>
          <h2 className="text-center text-lg font-semibold">
            {t("dialogs.coverTitle")}
          </h2>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {t("dialogs.coverDescription")}
        </DialogDescription>
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              {t("dialogs.coverUpload")}
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex-1">
              {t("dialogs.coverColors")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <SingleImageDropzone
              className="w-full outline-hidden"
              disabled={isSubmitting}
              value={file}
              onChange={onChange}
              isDragging={isDragging}
            />
          </TabsContent>
          <TabsContent value="colors">
            <div className="grid grid-cols-4 gap-2 p-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onSelectColor(color)}
                  className={cn(
                    "border-border h-14 w-full rounded-md border transition-transform hover:scale-105 hover:shadow-md",
                    coverImage.url === color &&
                      "ring-primary ring-2 ring-offset-2",
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
