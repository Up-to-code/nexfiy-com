"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "convex/react";
import { useCreateBlockNote } from "@blocknote/react";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from "@blocknote/react";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import { toast } from "sonner";
import { Code2, Link2, Play } from "lucide-react";

import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { EditorFont } from "@/hooks/useEditorFont";
import { useCoverImage } from "@/hooks/useCoverImage";
import { fontFamilies } from "@/lib/editorFont";
import { logger } from "@/lib/logger";
import { uploadFile } from "@/lib/uploadthing";
import { Skeleton } from "@/components/ui/skeleton";

import {
  blockNoteToNormalizedBlocks,
  editorBlockInputsSignature,
  normalizedBlocksToBlockNote,
  normalizedBlocksToEditorInputs,
  type NormalizedPageBlock,
} from "./blockNoteAdapter";
import { nexfiyBlockNoteSchema } from "./blockNoteSchema";

type NormalizedBlockNoteEditorProps = {
  pageId: Id<"documents">;
  editable?: boolean;
  editorFont?: string;
  smallText?: boolean;
};

function ReadyNormalizedEditor({
  pageId,
  blocks,
  editable,
  editorFont,
  smallText,
}: NormalizedBlockNoteEditorProps & { blocks: NormalizedPageBlock[] }) {
  const { resolvedTheme } = useTheme();
  const coverImage = useCoverImage();
  const replaceFromEditor = useMutation(api.pageBlocks.replaceFromEditor);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const serverDocument = useMemo(
    () => normalizedBlocksToBlockNote(blocks),
    [blocks],
  );
  const serverSignature = useMemo(
    () => editorBlockInputsSignature(normalizedBlocksToEditorInputs(blocks)),
    [blocks],
  );
  const appliedSignatureRef = useRef(serverSignature);
  const localSignatureRef = useRef(serverSignature);
  const localRevisionRef = useRef(0);
  const hasUnacknowledgedChangesRef = useRef(false);
  const serverDocumentRef = useRef(serverDocument);
  const serverSignatureRef = useRef(serverSignature);
  const editor = useCreateBlockNote({
    initialContent: serverDocument,
    uploadFile: (file) => uploadFile("documentFile", file),
    schema: nexfiyBlockNoteSchema,
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
  });
  const slashMenuItems = useMemo(
    () => [
      ...getDefaultReactSlashMenuItems(editor),
      {
        title: "Labeled link",
        subtext: "Add a link with a clear display label",
        aliases: ["link", "url", "bookmark", "label"],
        group: "Embeds",
        icon: <Link2 className="size-4" />,
        onItemClick: () =>
          insertOrUpdateBlockForSlashMenu(editor, { type: "linkCard" }),
      },
      {
        title: "YouTube",
        subtext: "Embed a YouTube video",
        aliases: ["youtube", "video", "embed"],
        group: "Embeds",
        icon: <Play className="size-4" />,
        onItemClick: () =>
          insertOrUpdateBlockForSlashMenu(editor, { type: "youtubeEmbed" }),
      },
      {
        title: "GitHub repository",
        subtext: "Link to a GitHub project",
        aliases: ["github", "git", "repository", "repo"],
        group: "Embeds",
        icon: <Code2 className="size-4" />,
        onItemClick: () =>
          insertOrUpdateBlockForSlashMenu(editor, {
            type: "githubRepository",
          }),
      },
    ],
    [editor],
  );
  const getSlashMenuItems = useCallback(
    async (query: string) => filterSuggestionItems(slashMenuItems, query),
    [slashMenuItems],
  );

  useEffect(() => {
    serverDocumentRef.current = serverDocument;
    serverSignatureRef.current = serverSignature;
  }, [serverDocument, serverSignature]);

  useEffect(() => {
    if (serverSignature === localSignatureRef.current) {
      hasUnacknowledgedChangesRef.current = false;
      appliedSignatureRef.current = serverSignature;
      return;
    }

    if (
      hasUnacknowledgedChangesRef.current ||
      serverSignature === appliedSignatureRef.current
    ) {
      return;
    }

    editor.replaceBlocks(editor.document, serverDocument);
    appliedSignatureRef.current = serverSignature;
    localSignatureRef.current = serverSignature;
  }, [editor, serverDocument, serverSignature]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const save = useCallback(() => {
    if (!editable) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const nextBlocks = blockNoteToNormalizedBlocks(editor.document);
    const nextSignature = editorBlockInputsSignature(nextBlocks);
    const revision = localRevisionRef.current + 1;
    localRevisionRef.current = revision;
    appliedSignatureRef.current = nextSignature;
    localSignatureRef.current = nextSignature;
    hasUnacknowledgedChangesRef.current = true;
    saveTimerRef.current = setTimeout(() => {
      void replaceFromEditor({ pageId, blocks: nextBlocks }).catch((error) => {
        logger.error("Failed to save the page editor", error);
        if (revision !== localRevisionRef.current) return;
        toast.error("Could not save this page");
        editor.replaceBlocks(editor.document, serverDocumentRef.current);
        appliedSignatureRef.current = serverSignatureRef.current;
        localSignatureRef.current = serverSignatureRef.current;
        hasUnacknowledgedChangesRef.current = false;
      });
    }, 350);
  }, [editable, editor, pageId, replaceFromEditor]);

  return (
    <div
      className="relative flex-1 shrink-0 px-0 pb-10"
      style={
        {
          "--editor-font": fontFamilies[editorFont as EditorFont],
          "--editor-font-size": smallText ? "15px" : "16px",
        } as React.CSSProperties
      }
    >
      <BlockNoteView
        editable={Boolean(editable) && !coverImage.isOpen}
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={save}
        slashMenu={false}
        className="wrap-break-word"
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </div>
  );
}

export function NormalizedBlockNoteEditor({
  pageId,
  editable = true,
  editorFont,
  smallText = false,
}: NormalizedBlockNoteEditorProps) {
  const blocks = useQuery(api.pageBlocks.list, { pageId });
  if (blocks === undefined) return <Skeleton className="h-48 w-full" />;
  return (
    <ReadyNormalizedEditor
      key={pageId}
      pageId={pageId}
      blocks={blocks}
      editable={editable}
      editorFont={editorFont}
      smallText={smallText}
    />
  );
}
