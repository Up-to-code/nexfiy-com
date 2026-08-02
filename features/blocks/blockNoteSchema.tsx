"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { codeBlockOptions } from "@blocknote/code-block";
import { useQuery } from "convex/react";
import { FileText, RefreshCw } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DatabaseTable } from "@/features/databases/DatabaseTable";
import {
  githubRepositoryBlock,
  linkCardBlock,
  youtubeEmbedBlock,
} from "./linkBlocks";

function EmbeddedDatabaseBlock({
  dataSourceId,
  viewId,
  readOnly,
}: {
  dataSourceId: string;
  viewId: string;
  readOnly: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stopBlockNoteTableHandler = (event: MouseEvent) =>
      event.stopPropagation();
    container.addEventListener("mousemove", stopBlockNoteTableHandler);
    return () =>
      container.removeEventListener("mousemove", stopBlockNoteTableHandler);
  }, []);

  return (
    <div ref={containerRef} className="my-1 min-w-0" contentEditable={false}>
      {dataSourceId && viewId ? (
        <DatabaseTable
          dataSourceId={dataSourceId as Id<"dataSources">}
          initialViewId={viewId as Id<"databaseViews">}
          embedded
          readOnly={readOnly}
        />
      ) : (
        <div className="text-muted-foreground rounded-md border border-dashed p-5 text-sm">
          Database view unavailable
        </div>
      )}
    </div>
  );
}

const databaseViewBlock = createReactBlockSpec(
  {
    type: "databaseView",
    propSchema: {
      dataSourceId: { default: "" },
      viewId: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <EmbeddedDatabaseBlock
        dataSourceId={block.props.dataSourceId}
        viewId={block.props.viewId}
        readOnly={!editor.isEditable}
      />
    ),
  },
)();

const calloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      color: { default: "default" },
    },
    content: "inline",
  },
  {
    render: ({ contentRef }) => (
      <div className="bg-muted/50 my-1 w-full rounded-md border px-3 py-2">
        <div ref={contentRef} />
      </div>
    ),
  },
)();

function ChildPageBlock({ linkedPageId }: { linkedPageId: string }) {
  const page = useQuery(
    api.documents.getById,
    linkedPageId ? { documentId: linkedPageId as Id<"documents"> } : "skip",
  );
  if (!page) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
        Sub-page unavailable
      </div>
    );
  }
  return (
    <Link
      href={`/documents/${page._id}`}
      className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 font-medium underline underline-offset-4"
    >
      <span aria-hidden>{page.icon || <FileText className="size-4" />}</span>
      {page.title || "Untitled"}
    </Link>
  );
}

const childPageBlock = createReactBlockSpec(
  {
    type: "childPage",
    propSchema: { linkedPageId: { default: "" } },
    content: "none",
  },
  {
    render: ({ block }) => (
      <div contentEditable={false}>
        <ChildPageBlock linkedPageId={block.props.linkedPageId} />
      </div>
    ),
  },
)();

const bookmarkBlock = createReactBlockSpec(
  {
    type: "bookmarkCard",
    propSchema: { url: { default: "" } },
    content: "none",
  },
  {
    render: ({ block }) => (
      <a
        href={block.props.url || undefined}
        target="_blank"
        rel="noreferrer"
        contentEditable={false}
        className="text-primary block truncate rounded-md border px-3 py-2 text-sm underline underline-offset-4"
      >
        {block.props.url || "Empty bookmark"}
      </a>
    ),
  },
)();

const syncedReferenceBlock = createReactBlockSpec(
  {
    type: "syncedReference",
    propSchema: {
      referenceBlockId: { default: "" },
      syncGroupId: { default: "" },
    },
    content: "none",
  },
  {
    render: () => (
      <div
        className="border-primary/30 bg-primary/[0.02] text-primary flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        contentEditable={false}
      >
        <RefreshCw className="size-4" /> Synced block
      </div>
    ),
  },
)();

const columnsLayoutBlock = createReactBlockSpec(
  {
    type: "columnsLayout",
    propSchema: {},
    content: "none",
  },
  {
    render: () => <div className="nexfiy-columns-marker" />,
  },
)();

const columnLayoutBlock = createReactBlockSpec(
  {
    type: "columnLayout",
    propSchema: {},
    content: "none",
  },
  {
    render: () => <div className="nexfiy-column-marker" />,
  },
)();

export const nexfiyBlockNoteSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec({
      ...codeBlockOptions,
      defaultLanguage: "typescript",
      supportedLanguages: {
        typescript: { name: "TypeScript", aliases: ["ts"] },
        javascript: { name: "JavaScript", aliases: ["js"] },
        python: { name: "Python", aliases: ["py"] },
        cpp: { name: "C++", aliases: ["cpp", "c++"] },
        java: { name: "Java" },
        rust: { name: "Rust", aliases: ["rs"] },
        go: { name: "Go" },
        sql: { name: "SQL" },
        html: { name: "HTML" },
        css: { name: "CSS" },
      },
    }),
    databaseView: databaseViewBlock,
    callout: calloutBlock,
    childPage: childPageBlock,
    bookmarkCard: bookmarkBlock,
    linkCard: linkCardBlock,
    youtubeEmbed: youtubeEmbedBlock,
    githubRepository: githubRepositoryBlock,
    syncedReference: syncedReferenceBlock,
    columnsLayout: columnsLayoutBlock,
    columnLayout: columnLayoutBlock,
  },
});

export type NexfiyBlockNoteSchema = typeof nexfiyBlockNoteSchema;
