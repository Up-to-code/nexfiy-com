"use client";

import { useState } from "react";

import type { Id } from "@/convex/_generated/dataModel";

import type { PageBlockType } from "./registry";
import type { usePageBlocks } from "./usePageBlocks";
import type { BlockCommandAnchor } from "./BlockCommandDialog";

export type BlockInsertContext = {
  parentBlockId?: Id<"pageBlocks">;
  afterBlockId?: Id<"pageBlocks">;
  replaceBlockId?: Id<"pageBlocks">;
};

type PageBlockActions = Pick<
  ReturnType<typeof usePageBlocks>,
  "createBlock" | "createColumns" | "createChildPage" | "replaceEmptyParagraph"
>;

type DatabaseViewSelection = {
  dataSourceId: Id<"dataSources">;
  viewId: Id<"databaseViews">;
};

export function useBlockInsertion(actions: PageBlockActions) {
  const [commandContext, setCommandContext] = useState<BlockInsertContext>();
  const [commandAnchor, setCommandAnchor] = useState<BlockCommandAnchor>();
  const [databaseContext, setDatabaseContext] = useState<BlockInsertContext>();

  const requestInsert = (
    context: BlockInsertContext = {},
    anchorElement?: HTMLElement,
  ) => {
    const rect = anchorElement?.getBoundingClientRect();
    setCommandAnchor(
      rect
        ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : undefined,
    );
    setCommandContext(context);
  };

  const selectBlock = (type: PageBlockType) => {
    const context = commandContext ?? {};
    setCommandContext(undefined);
    if (type === "database_view") {
      setDatabaseContext(context);
      return;
    }
    if (type === "child_page") {
      void actions.createChildPage({
        parentBlockId: context.parentBlockId,
        afterBlockId: context.afterBlockId,
        replaceBlockId: context.replaceBlockId,
        operationId: crypto.randomUUID(),
      });
      return;
    }
    if (context.replaceBlockId) {
      void actions.replaceEmptyParagraph(context.replaceBlockId, { type });
      return;
    }
    if (type === "columns") void actions.createColumns(context);
    else
      void actions.createBlock({
        type,
        parentBlockId: context.parentBlockId,
        afterBlockId: context.afterBlockId,
      });
  };

  const selectDatabaseView = async (selection: DatabaseViewSelection) => {
    const result = databaseContext?.replaceBlockId
      ? await actions.replaceEmptyParagraph(databaseContext.replaceBlockId, {
          type: "database_view",
          ...selection,
        })
      : await actions.createBlock({
          type: "database_view",
          parentBlockId: databaseContext?.parentBlockId,
          afterBlockId: databaseContext?.afterBlockId,
          ...selection,
        });
    if (result) setDatabaseContext(undefined);
    return result;
  };

  return {
    isCommandOpen: commandContext !== undefined,
    commandAnchor,
    isDatabasePickerOpen: databaseContext !== undefined,
    requestInsert,
    selectBlock,
    selectDatabaseView,
    setCommandOpen: (open: boolean) => {
      if (!open) {
        setCommandContext(undefined);
        setCommandAnchor(undefined);
      }
    },
    setDatabasePickerOpen: (open: boolean) => {
      if (!open) setDatabaseContext(undefined);
    },
  };
}
