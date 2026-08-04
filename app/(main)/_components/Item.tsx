"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  LucideIcon,
  MoreHorizontal,
  Plus,
  Settings,
  Star,
  Trash,
} from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { useI18n } from "@/lib/i18n/I18nProvider";
import posthog from "posthog-js";

interface ItemProps {
  id?: Id<"documents">;
  documentIcon?: string;
  active?: boolean;
  expanded?: boolean;
  level?: number;
  onExpand?: () => void;
  label?: string;
  onClick?: () => void;
  icon: LucideIcon;
  isFavorite?: boolean;
  onFavorite?: () => void;
  shortcut?: string;
  showDragHandle?: boolean;
  navDrawer?: boolean;
  supportsCanvasSubPages?: boolean;
}

export const Item = ({
  id,
  label,
  onClick,
  icon: Icon,
  active,
  documentIcon,
  level = 0,
  onExpand,
  expanded,
  isFavorite,
  onFavorite,
  shortcut,
  showDragHandle = true,
  navDrawer,
  supportsCanvasSubPages = false,
}: ItemProps) => {
  const router = useRouter();
  const params = useParams();
  const { t, resolvedLocale } = useI18n();

  const { setInnerPopoverOpen } = useNavDrawer();

  const create = useMutation(api.documents.create);
  const createChildPage = useMutation(api.pageBlocks.createChildPage);
  const archive = useMutation(api.documents.archive);
  const restore = useMutation(api.documents.restore);

  const document = useQuery(
    api.documents.getById,
    id ? { documentId: id } : "skip",
  );

  const onArchive = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    if (params.documentId === id) {
      router.push("/documents");
    }

    const promise = archive({ id });

    void promise.then(() => {
      posthog.capture("document_archived");
    }).catch(() => undefined);

    toast.promise(promise, {
      loading: t("app.noteMovedToTrash"),
      error: t("app.archiveFailed"),
    });

    promise.then(() => {
      toast(t("app.noteMovedToTrash"), {
        action: {
          label: t("app.undo"),
          onClick: () => restore({ id }),
        },
      });
    });
  };

  const handleExpand = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    onExpand?.();
  };

  const onCreate = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    const creation = supportsCanvasSubPages
      ? createChildPage({
          pageId: id,
          title: t("common.untitled"),
          operationId: crypto.randomUUID(),
        }).then((result) => result.pageId)
      : create({ title: t("common.untitled"), parentDocument: id });
    const promise = creation.then((documentId) => {
      posthog.capture("document_created", { source: "sub_page" });
      if (!expanded) {
        onExpand?.();
      }
      router.push(`/documents/${documentId}`);
    });

    toast.promise(promise, {
      loading: t("app.creatingNote"),
      success: t("app.noteCreated"),
      error: t("app.createFailed"),
    });
  };

  const onOpenChange = (open: boolean) => {
    if (!navDrawer) return;
    setInnerPopoverOpen(open);
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      onClick={onClick}
      role="button"
      style={{ paddingLeft: level ? `${level * 12 + 12}px` : "12px" }}
      className={cn(
        "group text-muted-foreground hover:bg-primary/5 relative flex min-h-6.75 w-full items-center py-1 pr-3 text-sm font-medium",
        active && "bg-primary/5 text-primary",
        navDrawer && !id ? "rounded-full" : "rounded-none",
      )}
    >
      <div className="group flex items-center justify-center truncate">
        {!!id && showDragHandle && (
          <GripVertical className="text-muted-foreground/50 absolute left-0.5 size-3 opacity-0 group-hover:opacity-100" />
        )}
        {!!id && (
          <div
            role="button"
            aria-label={expanded ? t("app.collapsePage") : t("app.expandPage")}
            aria-expanded={!!expanded}
            className="mr-1 h-full rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600"
            onClick={handleExpand}
          >
            <ChevronIcon className="text-muted-foreground/50 h-4 w-4 shrink-0" />
          </div>
        )}
        {documentIcon ? (
          <div className="mr-1 shrink-0 text-[1.125rem] leading-none">
            {documentIcon}
          </div>
        ) : (
          <Icon
            className={`text-muted-foreground h-4.5 w-4.5 shrink-0 ${navDrawer && Icon === Settings ? "mr-0" : "mr-2"}`}
          />
        )}
        {label && (
          <span className="truncate" title={label}>
            {label}
          </span>
        )}
      </div>
      {shortcut && (
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[.625rem] font-medium opacity-100 select-none md:inline-flex dark:bg-neutral-700">
          {shortcut}
        </kbd>
      )}
      {!!id && (
        <div className="ml-auto flex items-center gap-x-2">
          <ActionTooltip label={t("app.addSubPage")}>
            <div
              role="button"
              aria-label={t("app.addSubPage")}
              onClick={onCreate}
              className="ml-auto h-full rounded-sm opacity-100 transition hover:bg-neutral-300 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-neutral-600"
            >
              <Plus className="text-muted-foreground h-4 w-4" />
            </div>
          </ActionTooltip>
          <DropdownMenu onOpenChange={navDrawer ? onOpenChange : undefined}>
            <ActionTooltip label={t("app.moreActions")}>
              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                <div
                  role="button"
                  aria-label={t("app.moreActions")}
                  className="ml-auto h-full rounded-sm opacity-100 transition hover:bg-neutral-300 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-neutral-600"
                >
                  <MoreHorizontal className="text-muted-foreground h-4 w-4" />
                </div>
              </DropdownMenuTrigger>
            </ActionTooltip>
            <DropdownMenuContent
              className="w-65"
              align="start"
              side="right"
              forceMount
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.();
                }}
              >
                <Star
                  className={cn(
                    "mr-2 h-4 w-4",
                    isFavorite && "fill-yellow-400 text-yellow-400",
                  )}
                />
                {isFavorite ? t("app.removeFromFavorites") : t("app.addToFavorites")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Trash className="mr-2 h-4 w-4" />
                {t("app.delete")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="space-y-0.5 p-2 text-[.6875rem]">
                <p className="text-muted-foreground/70">
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
                <p className="text-muted-foreground/70">
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
        </div>
      )}
    </div>
  );
};

Item.Skeleton = function ItemSkeleton({ level }: { level?: number }) {
  return (
    <div
      style={{ paddingLeft: level ? `${level * 12 + 25}px` : "12px" }}
      className="flex gap-x-2 py-0.75"
    >
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[30%]" />
    </div>
  );
};
