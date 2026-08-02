"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import TextareaAutosize from "react-textarea-autosize";
import {
  ChevronRight,
  FileText,
  GripVertical,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { DatabaseTable } from "@/features/databases/DatabaseTable";
import { fontFamilies } from "@/lib/editorFont";
import type { EditorFont } from "@/hooks/useEditorFont";

import { BLOCK_DRAG_MIME } from "./drag";
import { BLOCK_REGISTRY } from "./registry";
import { usePageBlocks } from "./usePageBlocks";
import { DatabaseViewPickerDialog } from "./DatabaseViewPickerDialog";
import { SyncBlockDialog } from "./SyncBlockDialog";
import { BlockCommandMenu } from "./BlockCommandDialog";
import {
  useBlockInsertion,
  type BlockInsertContext,
} from "./useBlockInsertion";
import { useBlockKeyboardNavigation } from "./useBlockKeyboardNavigation";

type PageBlocksState = ReturnType<typeof usePageBlocks>;
type PageBlock = NonNullable<PageBlocksState["blocks"]>[number];
type BlockUpdate = {
  text?: string;
  checked?: boolean;
  url?: string;
  color?: string;
  propsJson?: string;
};
type RenderBlockState = {
  blocks: PageBlocksState["blocks"];
  updateBlock: (
    blockId: Id<"pageBlocks">,
    input: BlockUpdate,
  ) => Promise<unknown>;
  moveBlock?: PageBlocksState["moveBlock"];
  removeBlock?: PageBlocksState["removeBlock"];
};
type BlockKeyboardActions = {
  splitBlockAtCaret: (
    blockId: Id<"pageBlocks">,
    text: string,
    cursorOffset: number,
  ) => Promise<boolean>;
  removeEmptyBlock: (blockId: Id<"pageBlocks">) => boolean;
};

function AddBlockButton({
  onClick,
}: {
  onClick: (anchorElement: HTMLButtonElement) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={(event) => onClick(event.currentTarget)}
    >
      <Plus className="size-4" /> Add block
    </Button>
  );
}

function EditableText({
  block,
  onUpdate,
  onSlashCommand,
  keyboard,
  editable = true,
}: {
  block: PageBlock;
  onUpdate: RenderBlockState["updateBlock"];
  onSlashCommand?: (anchorElement: HTMLTextAreaElement) => void;
  keyboard?: BlockKeyboardActions;
  editable?: boolean;
}) {
  const skipNextBlurSave = useRef(false);
  const headingClass =
    block.type === "heading_1"
      ? "text-3xl font-bold"
      : block.type === "heading_2"
        ? "text-2xl font-semibold"
        : block.type === "heading_3"
          ? "text-xl font-semibold"
          : block.type === "quote"
            ? "border-l-3 pl-4 italic"
            : "text-base";
  const prefix =
    block.type === "bulleted_list"
      ? "•"
      : block.type === "numbered_list"
        ? "1."
        : null;
  if (!editable) {
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {block.type === "checklist" ? (
          <span
            aria-hidden
            className={cn(
              "mt-1 size-4 shrink-0 rounded border",
              block.checked && "bg-primary",
            )}
          />
        ) : null}
        {prefix ? <span className="pt-1">{prefix}</span> : null}
        <div
          className={cn(
            "min-h-7 min-w-0 flex-1 py-0.5 whitespace-pre-wrap",
            headingClass,
            block.checked && "text-muted-foreground line-through",
          )}
        >
          {block.text ?? ""}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      {block.type === "checklist" ? (
        <button
          type="button"
          aria-label={block.checked ? "Mark incomplete" : "Mark complete"}
          className={cn(
            "mt-1 size-4 rounded border",
            block.checked && "bg-primary",
          )}
          onClick={() => onUpdate(block.id, { checked: !block.checked })}
        />
      ) : null}
      {prefix ? <span className="pt-1">{prefix}</span> : null}
      <TextareaAutosize
        key={`${block.id}:${block.text ?? ""}`}
        defaultValue={block.text ?? ""}
        minRows={1}
        data-page-block-input={block.id}
        aria-label={`${BLOCK_REGISTRY[block.type].label} block`}
        placeholder="Enter text or type '/' for commands"
        className={cn(
          "field-sizing-content min-h-7 w-full resize-none bg-transparent py-0.5 outline-none",
          headingClass,
          block.checked && "text-muted-foreground line-through",
        )}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (
            event.key === "/" &&
            event.currentTarget.value.length === 0 &&
            onSlashCommand
          ) {
            event.preventDefault();
            onSlashCommand(event.currentTarget);
            return;
          }
          if (event.key === "Enter" && !event.shiftKey && keyboard) {
            event.preventDefault();
            skipNextBlurSave.current = true;
            void keyboard
              .splitBlockAtCaret(
                block.id,
                event.currentTarget.value,
                event.currentTarget.selectionStart,
              )
              .then((succeeded) => {
                if (!succeeded) skipNextBlurSave.current = false;
              });
            return;
          }
          if (
            event.key === "Backspace" &&
            event.currentTarget.value.length === 0 &&
            keyboard?.removeEmptyBlock(block.id)
          ) {
            event.preventDefault();
            skipNextBlurSave.current = true;
          }
        }}
        onBlur={(event) => {
          if (skipNextBlurSave.current) {
            skipNextBlurSave.current = false;
            return;
          }
          void onUpdate(block.id, { text: event.target.value });
        }}
      />
    </div>
  );
}

function BlockContent({
  block,
  state,
  onSlashCommand,
  keyboard,
  editable = true,
}: {
  block: PageBlock;
  state: RenderBlockState;
  onSlashCommand?: (anchorElement: HTMLTextAreaElement) => void;
  keyboard?: BlockKeyboardActions;
  editable?: boolean;
}) {
  if (block.type === "divider") return <hr className="my-2" />;
  if (["image", "file", "bookmark"].includes(block.type)) {
    if (!editable) {
      return block.url ? (
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary min-w-0 flex-1 truncate rounded-md border px-3 py-2 text-sm underline underline-offset-4"
        >
          {block.url}
        </a>
      ) : null;
    }
    return (
      <input
        key={`${block.id}:${block.url ?? ""}`}
        type="url"
        defaultValue={block.url ?? ""}
        aria-label={`${BLOCK_REGISTRY[block.type].label} URL`}
        placeholder="Paste a URL…"
        className="bg-muted/40 w-full rounded-md border px-3 py-2 text-sm outline-none"
        onBlur={(event) =>
          state.updateBlock(block.id, { url: event.target.value })
        }
      />
    );
  }
  if (block.type === "database_view") {
    if (block.dataSourceId && block.viewId) {
      return (
        <div className="min-w-0 flex-1">
          <DatabaseTable
            dataSourceId={block.dataSourceId}
            initialViewId={block.viewId}
            embedded
            readOnly={!editable}
          />
        </div>
      );
    }
    return (
      <div className="bg-muted/30 text-muted-foreground rounded-md border border-dashed p-5 text-sm">
        Database view block · select a data source and saved view
      </div>
    );
  }
  if (block.type === "child_page") {
    return <ChildPageContent linkedPageId={block.linkedPageId} />;
  }
  if (block.type === "synced_reference") {
    return <SyncedReferenceContent referenceBlockId={block.id} />;
  }
  if (block.type === "columns" || block.type === "column") return null;
  return (
    <EditableText
      block={block}
      onUpdate={state.updateBlock}
      onSlashCommand={onSlashCommand}
      keyboard={keyboard}
      editable={editable}
    />
  );
}

function ChildPageContent({
  linkedPageId,
}: {
  linkedPageId?: Id<"documents">;
}) {
  const page = useQuery(
    api.documents.getById,
    linkedPageId ? { documentId: linkedPageId } : "skip",
  );
  if (!linkedPageId) {
    return (
      <p className="text-destructive flex-1 rounded border border-dashed px-3 py-2 text-sm">
        Sub-page link is missing.
      </p>
    );
  }
  if (page === undefined) return <Skeleton className="h-9 flex-1" />;
  if (!page || page.isArchived) {
    return (
      <p className="text-muted-foreground flex-1 rounded border border-dashed px-3 py-2 text-sm">
        Sub-page is unavailable.
      </p>
    );
  }
  return (
    <Link
      href={`/documents/${page._id}`}
      className="hover:bg-muted decoration-muted-foreground/40 flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm font-medium underline underline-offset-4"
    >
      <span className="shrink-0 text-base" aria-hidden>
        {page.icon || <FileText className="size-4" />}
      </span>
      <span className="truncate">{page.title || "Untitled"}</span>
    </Link>
  );
}

function SyncedReferenceContent({
  referenceBlockId,
}: {
  referenceBlockId: Id<"pageBlocks">;
}) {
  const synced = useQuery(api.syncedBlocks.getByReference, {
    referenceBlockId,
  });
  const update = useMutation(api.pageBlocks.update);
  const syncedState = useMemo<RenderBlockState>(
    () => ({
      blocks: synced?.blocks,
      updateBlock: async (blockId, value) => {
        try {
          await update({ blockId, ...value });
          return null;
        } catch (error) {
          logger.error("Failed to update synced block content", error);
          toast.error("Could not update the synced block");
          return null;
        }
      },
    }),
    [synced?.blocks, update],
  );
  if (!synced) return <Skeleton className="h-20 w-full" />;
  const sourceRoot = synced.blocks.find(
    (block) => block.id === synced.sourceRootBlockId,
  );
  if (!sourceRoot) {
    return (
      <p className="text-destructive rounded border border-dashed p-3 text-sm">
        Synced block source is unavailable.
      </p>
    );
  }
  return (
    <div className="border-primary/30 bg-primary/[0.02] min-w-0 flex-1 rounded-md border p-2">
      <div className="text-primary mb-1 flex items-center gap-1.5 px-1 text-xs font-medium">
        <RefreshCw className="size-3" /> Synced
      </div>
      <BlockTree
        block={sourceRoot}
        state={syncedState}
        structuralEditing={false}
      />
    </div>
  );
}

function BlockNode({
  block,
  childBlocks,
  state,
  structuralEditing = true,
  onRequestSync,
  onUnlink,
  onRequestInsert,
  keyboard,
  editable = true,
}: {
  block: PageBlock;
  childBlocks: PageBlock[];
  state: RenderBlockState;
  structuralEditing?: boolean;
  onRequestSync?: (blockId: Id<"pageBlocks">) => void;
  onUnlink?: (referenceBlockId: Id<"pageBlocks">) => void;
  onRequestInsert?: (
    context: BlockInsertContext,
    anchorElement?: HTMLElement,
  ) => void;
  keyboard?: BlockKeyboardActions;
  editable?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const definition = BLOCK_REGISTRY[block.type];
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!structuralEditing) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(BLOCK_DRAG_MIME, block.id);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!structuralEditing || !state.moveBlock) return;
    const movedId = event.dataTransfer.getData(BLOCK_DRAG_MIME);
    if (!movedId || movedId === block.id) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const rect = event.currentTarget.getBoundingClientRect();
    const placement =
      definition.acceptsChildren && event.clientX > rect.left + 48
        ? "inside"
        : event.clientY < rect.top + rect.height / 2
          ? "before"
          : "after";
    void state.moveBlock({
      blockId: movedId as Id<"pageBlocks">,
      targetPageId: block.pageId,
      targetBlockId: block.id,
      placement,
    });
  };
  const content = (
    <div
      onDragOver={(event) => {
        if (!structuralEditing) return;
        if (!event.dataTransfer.types.includes(BLOCK_DRAG_MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={structuralEditing ? handleDrop : undefined}
      className={cn(
        "group/block relative flex min-w-0 items-start gap-1 rounded px-1 py-0.5",
        isDragOver && "ring-primary/40 ring-2",
        block.type === "callout" && "bg-muted/50 border p-3",
      )}
    >
      {structuralEditing ? (
        <div
          draggable
          onDragStart={handleDragStart}
          className="mt-1 shrink-0 cursor-grab opacity-0 group-hover/block:opacity-100"
          aria-label={`Drag ${definition.label} block`}
        >
          <GripVertical className="text-muted-foreground size-4" />
        </div>
      ) : null}
      {block.type === "toggle" ? (
        <ChevronRight className="text-muted-foreground mt-1 size-4" />
      ) : null}
      <BlockContent
        block={block}
        state={state}
        onSlashCommand={
          structuralEditing && block.type === "paragraph" && onRequestInsert
            ? (anchorElement) =>
                onRequestInsert(
                  {
                    replaceBlockId: block.id,
                  },
                  anchorElement,
                )
            : undefined
        }
        keyboard={structuralEditing ? keyboard : undefined}
        editable={editable}
      />
      {structuralEditing ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover/block:opacity-100"
              aria-label={`Actions for ${definition.label} block`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {block.type === "synced_reference" ? (
              <DropdownMenuItem onSelect={() => onUnlink?.(block.id)}>
                <Unlink /> Unlink to independent blocks
              </DropdownMenuItem>
            ) : block.type !== "column" && block.type !== "child_page" ? (
              <DropdownMenuItem onSelect={() => onRequestSync?.(block.id)}>
                <RefreshCw /> Sync to another page
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => state.removeBlock?.(block.id)}
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );

  if (block.type === "columns") {
    return (
      <div className="group/block my-2 rounded border border-dashed p-2">
        {content}
        <div className="flex gap-3">
          {childBlocks.map((child) => (
            <BlockTree
              key={child.id}
              block={child}
              state={state}
              structuralEditing={structuralEditing}
              onRequestSync={onRequestSync}
              onUnlink={onUnlink}
              onRequestInsert={onRequestInsert}
              keyboard={keyboard}
              editable={editable}
            />
          ))}
        </div>
      </div>
    );
  }
  if (block.type === "column") {
    return (
      <div className="min-w-0 flex-1 rounded border border-dashed p-2">
        {content}
        <div className="space-y-1 pl-1">
          {childBlocks.map((child) => (
            <BlockTree
              key={child.id}
              block={child}
              state={state}
              structuralEditing={structuralEditing}
              onRequestSync={onRequestSync}
              onUnlink={onUnlink}
              onRequestInsert={onRequestInsert}
              keyboard={keyboard}
              editable={editable}
            />
          ))}
          {structuralEditing && onRequestInsert ? (
            <AddBlockButton
              onClick={(anchorElement) =>
                onRequestInsert({ parentBlockId: block.id }, anchorElement)
              }
            />
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div>
      {content}
      {childBlocks.length ? (
        <div className="space-y-1 pl-8">
          {childBlocks.map((child) => (
            <BlockTree
              key={child.id}
              block={child}
              state={state}
              structuralEditing={structuralEditing}
              onRequestSync={onRequestSync}
              onUnlink={onUnlink}
              onRequestInsert={onRequestInsert}
              keyboard={keyboard}
              editable={editable}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BlockTree({
  block,
  state,
  structuralEditing = true,
  onRequestSync,
  onUnlink,
  onRequestInsert,
  keyboard,
  editable = true,
}: {
  block: PageBlock;
  state: RenderBlockState;
  structuralEditing?: boolean;
  onRequestSync?: (blockId: Id<"pageBlocks">) => void;
  onUnlink?: (referenceBlockId: Id<"pageBlocks">) => void;
  onRequestInsert?: (
    context: BlockInsertContext,
    anchorElement?: HTMLElement,
  ) => void;
  keyboard?: BlockKeyboardActions;
  editable?: boolean;
}) {
  const children = (state.blocks ?? []).filter(
    (candidate) => candidate.parentBlockId === block.id,
  );
  if (
    !editable &&
    block.type === "paragraph" &&
    !block.text?.trim() &&
    children.length === 0
  ) {
    return null;
  }
  return (
    <BlockNode
      block={block}
      childBlocks={children}
      state={state}
      structuralEditing={structuralEditing}
      onRequestSync={onRequestSync}
      onUnlink={onUnlink}
      onRequestInsert={onRequestInsert}
      keyboard={keyboard}
      editable={editable}
    />
  );
}

export function BlockCanvas({
  pageId,
  editorFont,
  smallText = false,
  editable = true,
}: {
  pageId: Id<"documents">;
  editorFont?: string;
  smallText?: boolean;
  editable?: boolean;
}) {
  const state = usePageBlocks(pageId);
  const insertion = useBlockInsertion(state);
  const keyboard = useBlockKeyboardNavigation(state);
  const [syncSourceBlockId, setSyncSourceBlockId] =
    useState<Id<"pageBlocks">>();
  const createSyncedReference = useMutation(api.syncedBlocks.createReference);
  const unlinkSyncedReference = useMutation(api.syncedBlocks.unlink);
  const rootBlocks = useMemo(
    () => (state.blocks ?? []).filter((block) => !block.parentBlockId),
    [state.blocks],
  );

  useEffect(() => {
    if (!editable) return;
    if (
      state.blocks?.length !== 1 ||
      state.blocks[0].type !== "paragraph" ||
      state.blocks[0].text
    ) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>(
        `[data-page-block-canvas="${pageId}"] [data-page-block-input]`,
      );
      if (input && document.activeElement === document.body) input.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editable, pageId, state.blocks]);

  if (state.isLoading) return <Skeleton className="h-48 w-full" />;

  const syncBlock = async (targetPageId: Id<"documents">) => {
    if (!syncSourceBlockId) return false;
    try {
      await createSyncedReference({
        sourceBlockId: syncSourceBlockId,
        targetPageId,
      });
      toast.success("Synced reference created");
      setSyncSourceBlockId(undefined);
      return true;
    } catch (error) {
      logger.error("Failed to create synced reference", error);
      toast.error("Could not create the synced reference");
      return false;
    }
  };

  const unlinkBlock = async (referenceBlockId: Id<"pageBlocks">) => {
    try {
      await unlinkSyncedReference({ referenceBlockId });
      toast.success("Synced block unlinked");
    } catch (error) {
      logger.error("Failed to unlink synced reference", error);
      toast.error("Could not unlink the synced block");
    }
  };

  return (
    <div
      className="min-h-80 pb-28"
      data-page-block-canvas={pageId}
      style={
        {
          fontFamily: fontFamilies[editorFont as EditorFont],
          fontSize: smallText ? "15px" : "16px",
        } as React.CSSProperties
      }
    >
      <div className="space-y-1">
        {rootBlocks.map((block) => (
          <BlockTree
            key={block.id}
            block={block}
            state={state}
            structuralEditing={editable}
            onRequestSync={setSyncSourceBlockId}
            onUnlink={unlinkBlock}
            onRequestInsert={insertion.requestInsert}
            keyboard={keyboard}
            editable={editable}
          />
        ))}
      </div>
      {editable ? (
        <AddBlockButton
          onClick={(anchorElement) =>
            insertion.requestInsert({}, anchorElement)
          }
        />
      ) : null}
      {editable ? (
        <BlockCommandMenu
          open={insertion.isCommandOpen}
          onOpenChange={insertion.setCommandOpen}
          onSelect={insertion.selectBlock}
          anchor={insertion.commandAnchor}
        />
      ) : null}
      {editable ? (
        <DatabaseViewPickerDialog
          open={insertion.isDatabasePickerOpen}
          onOpenChange={insertion.setDatabasePickerOpen}
          onSelect={insertion.selectDatabaseView}
        />
      ) : null}
      {editable ? (
        <SyncBlockDialog
          open={Boolean(syncSourceBlockId)}
          onOpenChange={(open) => {
            if (!open) setSyncSourceBlockId(undefined);
          }}
          onSelect={syncBlock}
        />
      ) : null}
    </div>
  );
}
