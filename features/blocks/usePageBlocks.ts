"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

import type { PageBlockType } from "./registry";
import { optimisticallyMoveBlock } from "./optimisticBlockMove";

export function usePageBlocks(pageId: Id<"documents">) {
  const blocks = useQuery(api.pageBlocks.list, { pageId });
  const createMutation = useMutation(api.pageBlocks.create);
  const updateMutation = useMutation(api.pageBlocks.update);
  const replaceMutation = useMutation(api.pageBlocks.replaceEmptyParagraph);
  const splitMutation = useMutation(api.pageBlocks.splitAtCaret);
  const createChildPageMutation = useMutation(api.pageBlocks.createChildPage);
  const moveMutation = useMutation(api.pageBlocks.move).withOptimisticUpdate(
    optimisticallyMoveBlock,
  );
  const removeMutation = useMutation(api.pageBlocks.remove);

  const report = async <T>(label: string, operation: () => Promise<T>) => {
    try {
      return await operation();
    } catch (error) {
      logger.error(label, error);
      toast.error(label);
      return null;
    }
  };

  const createBlock = (input: {
    type: PageBlockType;
    parentBlockId?: Id<"pageBlocks">;
    afterBlockId?: Id<"pageBlocks">;
    text?: string;
    dataSourceId?: Id<"dataSources">;
    viewId?: Id<"databaseViews">;
  }) =>
    report("Could not add the block", () =>
      createMutation({ pageId, ...input }),
    );

  const createColumns = async (input?: {
    parentBlockId?: Id<"pageBlocks">;
    afterBlockId?: Id<"pageBlocks">;
  }) => {
    const columnsId = await createBlock({ type: "columns", ...input });
    if (!columnsId) return null;
    const firstColumnId = await createBlock({
      type: "column",
      parentBlockId: columnsId,
    });
    await createBlock({ type: "column", parentBlockId: columnsId });
    if (firstColumnId) {
      await createBlock({
        type: "paragraph",
        parentBlockId: firstColumnId,
        text: "",
      });
    }
    return columnsId;
  };

  return {
    blocks,
    isLoading: blocks === undefined,
    createBlock,
    createColumns,
    createChildPage: (input: {
      parentBlockId?: Id<"pageBlocks">;
      afterBlockId?: Id<"pageBlocks">;
      replaceBlockId?: Id<"pageBlocks">;
      title?: string;
      operationId: string;
    }) =>
      report("Could not create the sub-page", () =>
        createChildPageMutation({ pageId, ...input }),
      ),
    replaceEmptyParagraph: (
      blockId: Id<"pageBlocks">,
      input: {
        type: PageBlockType;
        dataSourceId?: Id<"dataSources">;
        viewId?: Id<"databaseViews">;
      },
    ) =>
      report("Could not replace the text block", () =>
        replaceMutation({ blockId, ...input }),
      ),
    splitBlockAtCaret: (
      blockId: Id<"pageBlocks">,
      text: string,
      cursorOffset: number,
      operationId: string,
    ) =>
      report("Could not split the block", () =>
        splitMutation({ blockId, text, cursorOffset, operationId }),
      ),
    updateBlock: (
      blockId: Id<"pageBlocks">,
      input: {
        text?: string;
        checked?: boolean;
        url?: string;
        color?: string;
        propsJson?: string;
      },
    ) =>
      report("Could not update the block", async () => {
        await updateMutation({ blockId, ...input });
        return true;
      }),
    moveBlock: (input: {
      blockId: Id<"pageBlocks">;
      targetPageId: Id<"documents">;
      targetBlockId?: Id<"pageBlocks">;
      placement: "before" | "after" | "inside";
    }) => report("Could not move the block", () => moveMutation(input)),
    removeBlock: (blockId: Id<"pageBlocks">) =>
      report("Could not remove the block", async () => {
        await removeMutation({ blockId });
        return true;
      }),
  };
}
