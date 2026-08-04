"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AArrowDown,
  BookTemplate,
  FilePlus2,
  CopyPlus,
  Maximize2,
  MoreHorizontal,
  Settings,
  TableOfContents,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/useSettingsModal";
import { ActionTooltip } from "@/components/action-tooltip";
import { useWordCount } from "@/hooks/useWordCount";
import { Switch } from "@/components/ui/switch";
import { TemplateGalleryDialog } from "@/features/templates/TemplateGalleryDialog";
import { logger } from "@/lib/logger";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface MenuProps {
  documentId: Id<"documents">;
}

export const Menu = ({ documentId }: MenuProps) => {
  const router = useRouter();
  const { t, resolvedLocale } = useI18n();

  const settings = useSettings();
  const words = useWordCount();

  const document = useQuery(api.documents.getById, {
    documentId,
  });
  const archive = useMutation(api.documents.archive);
  const update = useMutation(api.documents.update);
  const createTemplate = useMutation(api.pageTemplates.createFromPage);
  const duplicatePage = useMutation(api.pageTemplates.duplicatePage);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);

  const isFullWidth = document?.fullWidth ?? true;
  const toggleToc = document?.showToc ?? true;
  const isSmallText = !!document?.smallText;

  const onArchive = () => {
    router.push("/documents");
    const promise = archive({ id: documentId });

    toast.promise(promise, {
      loading: t("app.movingToTrash"),
      success: t("app.noteMovedToTrash"),
      error: t("app.archiveFailed"),
    });
  };

  const onFullWidthChange = (checked: boolean) => {
    update({
      id: documentId,
      fullWidth: checked,
    });
  };

  const onSmallTextChange = (checked: boolean) => {
    update({
      id: documentId,
      smallText: checked,
    });
  };

  const onTocChange = (checked: boolean) => {
    update({
      id: documentId,
      showToc: checked,
    });
  };

  const onSaveAsTemplate = async () => {
    if (!document) return;
    try {
      await createTemplate({
        sourcePageId: documentId,
        name: document.title,
      });
      toast.success(t("app.pageSavedAsTemplate"));
    } catch (error) {
      logger.error("Failed to save page template", error);
      toast.error(t("app.saveTemplateFailed"));
    }
  };

  const onDuplicate = async () => {
    try {
      const duplicatedId = await duplicatePage({ sourcePageId: documentId });
      toast.success(t("app.pageDuplicated"));
      router.push(`/documents/${duplicatedId}`);
    } catch (error) {
      logger.error("Failed to duplicate page", error);
      toast.error(t("app.duplicateFailed"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <ActionTooltip label={t("app.pageActions")}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label={t("app.pageActions")}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </ActionTooltip>
        <DropdownMenuContent
          className="w-65 px-2"
          align="end"
          alignOffset={8}
          forceMount
        >
          <MenuToggleItem
            label={t("app.smallText")}
            icon={AArrowDown}
            checked={isSmallText}
            onChange={onSmallTextChange}
          />
          <MenuToggleItem
            label={t("app.fullWidth")}
            icon={Maximize2}
            checked={isFullWidth}
            onChange={onFullWidthChange}
            rotateIcon
          />
          <MenuToggleItem
            label={t("app.showToc")}
            icon={TableOfContents}
            checked={toggleToc}
            onChange={onTocChange}
          />
          <DropdownMenuSeparator className="mx-1.5" />
          <DropdownMenuItem onClick={() => void onDuplicate()}>
            <CopyPlus className="mr-2 h-4 w-4" />
            {t("app.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveAsTemplate}>
            <BookTemplate className="mr-2 h-4 w-4" />
            {t("app.saveAsTemplate")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsTemplateGalleryOpen(true)}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            {t("app.addSubpageFromTemplate")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1.5" />
          <DropdownMenuItem onClick={() => settings.onOpen("preferences")}>
            <Settings className="mr-2 h-4 w-4" />
            {t("app.settings")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Trash className="mr-2 h-4 w-4" />
            {t("app.moveToTrash")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1.5" />
          <div className="text-muted-foreground/70 space-y-0.5 p-2 text-[.6875rem]">
            <p>
              {t("app.wordCount")}: {words.wordCount}{" "}
              {words.wordCount === 1 ? t("app.word") : t("app.words")}
            </p>
            <p>
              {t("app.lastEdited")}{" "}
              {document
                ? new Date(
                    document.updatedAt ?? document._creationTime,
                  ).toLocaleString(resolvedLocale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "..."}
            </p>
            <p>
              {t("app.createdOn")}{" "}
              {document
                ? new Date(document._creationTime).toLocaleString(resolvedLocale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "..."}
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <TemplateGalleryDialog
        open={isTemplateGalleryOpen}
        onOpenChange={setIsTemplateGalleryOpen}
        parentDocument={documentId}
      />
    </>
  );
};

Menu.Skeleton = function MenuSkeleton() {
  return <Skeleton className="h-8 w-8" />;
};

const MenuToggleItem = ({
  label,
  icon: Icon,
  checked,
  onChange,
  rotateIcon = false,
}: {
  label: string;
  icon: React.FC<{ className?: string }>;
  checked: boolean;
  onChange: (checked: boolean) => void;
  rotateIcon?: boolean;
}) => (
  <DropdownMenuItem
    onSelect={(e) => e.preventDefault()}
    onClick={() => {
      onChange(!checked);
    }}
    className="flex items-center justify-between"
  >
    <div className="flex items-center justify-between gap-1">
      <Icon
        className={`mr-2 h-4 w-4 ${rotateIcon ? "rotate-45" : " "}`}
      />
      {label}
    </div>
    <Switch size="sm" checked={checked} onCheckedChange={onChange} />
  </DropdownMenuItem>
);
