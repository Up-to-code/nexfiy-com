"use client";

import { useState, type DragEvent as ReactDragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileIcon, Table2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { BLOCK_DRAG_MIME } from "@/features/blocks/drag";
import { optimisticallyMoveBlock } from "@/features/blocks/optimisticBlockMove";
import { usePageTreeMutations } from "@/features/documents/usePageTreeMutations";

import { Item } from "./Item";

interface DocumentListProps {
  parentDocumentId?: Id<"documents">;
  level?: number;
  navDrawer?: boolean;
}

interface SortablePageProps {
  document: Doc<"documents">;
  level: number;
  expanded: boolean;
  expandedPages: Record<string, boolean>;
  onExpand: (id: string) => void;
  onRedirect: (id: string) => void;
  onFavorite: (id: Id<"documents">) => void;
  activeId?: string | string[];
  navDrawer?: boolean;
  onBlockMove: (
    blockId: Id<"pageBlocks">,
    targetPageId: Id<"documents">,
  ) => void;
}

function SortablePage({
  document,
  level,
  expanded,
  expandedPages,
  onExpand,
  onRedirect,
  onFavorite,
  activeId,
  navDrawer,
  onBlockMove,
}: SortablePageProps) {
  const [isBlockTarget, setIsBlockTarget] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: document._id,
    disabled: Boolean(document.dataSourceId),
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
        ),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 100 : undefined,
      }}
      className={isOver && !isDragging ? "ring-primary/30 ring-1" : undefined}
      onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
        if (document.contentModel !== "page_blocks") return;
        if (!event.dataTransfer.types.includes(BLOCK_DRAG_MIME)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setIsBlockTarget(true);
      }}
      onDragLeave={() => setIsBlockTarget(false)}
      onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
        if (document.contentModel !== "page_blocks") return;
        const blockId = event.dataTransfer.getData(BLOCK_DRAG_MIME);
        if (!blockId) return;
        event.preventDefault();
        event.stopPropagation();
        setIsBlockTarget(false);
        onBlockMove(blockId as Id<"pageBlocks">, document._id);
      }}
      {...attributes}
      {...listeners}
    >
      {isBlockTarget ? (
        <div className="border-primary bg-primary/5 pointer-events-none absolute inset-0 z-20 rounded border-2" />
      ) : null}
      <Item
        id={document._id}
        onClick={() => onRedirect(document._id)}
        label={document.title}
        icon={document.kind === "database" ? Table2 : FileIcon}
        documentIcon={document.icon}
        active={activeId === document._id}
        level={level}
        onExpand={() => onExpand(document._id)}
        expanded={expanded}
        isFavorite={document.isFavorite}
        onFavorite={() => onFavorite(document._id)}
        showDragHandle={!document.dataSourceId}
        navDrawer={navDrawer}
        supportsCanvasSubPages={
          document.contentModel === "page_blocks" &&
          document.kind !== "database"
        }
      />
      {expanded ? (
        <DocumentBranch
          parentDocumentId={document._id}
          level={level + 1}
          navDrawer={navDrawer}
          activeId={activeId}
          onExpand={onExpand}
          onRedirect={onRedirect}
          onFavorite={onFavorite}
          expandedPages={expandedPages}
          onBlockMove={onBlockMove}
        />
      ) : null}
    </div>
  );
}

function DocumentBranch({
  parentDocumentId,
  level,
  navDrawer,
  activeId,
  expandedPages,
  onExpand,
  onRedirect,
  onFavorite,
  onBlockMove,
}: {
  parentDocumentId?: Id<"documents">;
  level: number;
  navDrawer?: boolean;
  activeId?: string | string[];
  expandedPages: Record<string, boolean>;
  onExpand: (id: string) => void;
  onRedirect: (id: string) => void;
  onFavorite: (id: Id<"documents">) => void;
  onBlockMove: (
    blockId: Id<"pageBlocks">,
    targetPageId: Id<"documents">,
  ) => void;
}) {
  const documents = useQuery(api.documents.getSidebar, {
    parentDocument: parentDocumentId,
  });

  if (documents === undefined) {
    return (
      <>
        <Item.Skeleton level={level} />
        {level === 0 ? <Item.Skeleton level={level} /> : null}
      </>
    );
  }

  if (documents.length === 0 && level !== 0) {
    return (
      <p
        style={{ paddingLeft: `${level * 12 + 25}px` }}
        className="text-muted-foreground/80 py-1 text-sm font-medium"
      >
        No pages inside
      </p>
    );
  }

  return (
    <SortableContext
      items={documents.map((document) => document._id)}
      strategy={verticalListSortingStrategy}
    >
      {documents.map((document) => (
        <SortablePage
          key={document._id}
          document={document}
          level={level}
          expanded={expandedPages[document._id] ?? false}
          expandedPages={expandedPages}
          onExpand={onExpand}
          onRedirect={onRedirect}
          onFavorite={onFavorite}
          activeId={activeId}
          navDrawer={navDrawer}
          onBlockMove={onBlockMove}
        />
      ))}
    </SortableContext>
  );
}

export function DocumentList({
  parentDocumentId,
  level = 0,
  navDrawer,
}: DocumentListProps) {
  const params = useParams();
  const router = useRouter();
  const { movePage } = usePageTreeMutations();
  const moveBlock = useMutation(api.pageBlocks.move).withOptimisticUpdate(
    optimisticallyMoveBlock,
  );
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>(
    {},
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onExpand = (documentId: string) => {
    setExpandedPages((current) => ({
      ...current,
      [documentId]: !current[documentId],
    }));
  };

  const onFavorite = (id: Id<"documents">) => {
    toast.promise(toggleFavorite({ id }), {
      loading: "Updating favorites...",
      success: "Favorites updated!",
      error: "Failed to update favorites.",
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    document.body.classList.remove("cursor-grabbing");
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const translated = active.rect.current.translated;
    const activeCenter = translated
      ? translated.top + translated.height / 2
      : 0;
    const overCenter = over.rect.top + over.rect.height / 2;
    const placement =
      event.delta.x > 28
        ? "inside"
        : activeCenter < overCenter
          ? "before"
          : "after";
    const promise = movePage({
      id: active.id as Id<"documents">,
      targetId: over.id as Id<"documents">,
      placement,
    });
    toast.promise(promise, {
      loading: "Moving page...",
      success:
        placement === "inside" ? "Page nested successfully" : "Page moved",
      error: "Could not move that page",
    });
    if (placement === "inside") {
      setExpandedPages((current) => ({
        ...current,
        [String(over.id)]: true,
      }));
    }
  };

  const handleBlockMove = (
    blockId: Id<"pageBlocks">,
    targetPageId: Id<"documents">,
  ) => {
    toast.promise(
      moveBlock({
        blockId,
        targetPageId,
        placement: "after",
      }),
      {
        loading: "Moving block...",
        success: "Block moved to page",
        error: "Could not move the block",
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={() => document.body.classList.add("cursor-grabbing")}
      onDragCancel={() => document.body.classList.remove("cursor-grabbing")}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        <DocumentBranch
          parentDocumentId={parentDocumentId}
          level={level}
          navDrawer={navDrawer}
          activeId={params.documentId}
          expandedPages={expandedPages}
          onExpand={onExpand}
          onRedirect={(documentId) => router.push(`/documents/${documentId}`)}
          onFavorite={onFavorite}
          onBlockMove={handleBlockMove}
        />
      </div>
    </DndContext>
  );
}
