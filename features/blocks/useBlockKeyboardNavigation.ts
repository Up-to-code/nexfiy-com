"use client";

import { useEffect, useMemo, useState } from "react";

import type { Id } from "@/convex/_generated/dataModel";

import type { usePageBlocks } from "./usePageBlocks";

type PageBlocksState = ReturnType<typeof usePageBlocks>;
type PageBlock = NonNullable<PageBlocksState["blocks"]>[number];

const EDITABLE_BLOCK_TYPES = new Set<PageBlock["type"]>([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list",
  "numbered_list",
  "checklist",
  "quote",
  "callout",
  "toggle",
]);

function flattenBlockTree(blocks: PageBlock[]) {
  const childrenByParent = new Map<string, PageBlock[]>();
  for (const block of blocks) {
    const parentKey = block.parentBlockId ?? "root";
    const siblings = childrenByParent.get(parentKey) ?? [];
    siblings.push(block);
    childrenByParent.set(parentKey, siblings);
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((left, right) => left.order - right.order);
  }
  const flattened: PageBlock[] = [];
  const visit = (parentKey: string) => {
    for (const block of childrenByParent.get(parentKey) ?? []) {
      flattened.push(block);
      visit(block.id);
    }
  };
  visit("root");
  return flattened;
}

export function useBlockKeyboardNavigation(state: PageBlocksState) {
  const [focusTarget, setFocusTarget] = useState<{
    blockId: Id<"pageBlocks">;
    cursorOffset?: number;
  }>();
  const editableOrder = useMemo(
    () =>
      flattenBlockTree(state.blocks ?? []).filter((block) =>
        EDITABLE_BLOCK_TYPES.has(block.type),
      ),
    [state.blocks],
  );

  useEffect(() => {
    if (!focusTarget) return;
    const input = document.querySelector<HTMLTextAreaElement>(
      `[data-page-block-input="${focusTarget.blockId}"]`,
    );
    if (!input) return;
    input.focus();
    const cursorOffset = Math.min(
      focusTarget.cursorOffset ?? input.value.length,
      input.value.length,
    );
    input.setSelectionRange(cursorOffset, cursorOffset);
    const frame = requestAnimationFrame(() => setFocusTarget(undefined));
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, state.blocks]);

  const splitBlockAtCaret = async (
    blockId: Id<"pageBlocks">,
    text: string,
    cursorOffset: number,
  ) => {
    const result = await state.splitBlockAtCaret(
      blockId,
      text,
      cursorOffset,
      crypto.randomUUID(),
    );
    if (!result) return false;
    setFocusTarget({ blockId: result.focusBlockId, cursorOffset: 0 });
    return true;
  };

  const removeEmptyBlock = (blockId: Id<"pageBlocks">) => {
    const currentIndex = editableOrder.findIndex(
      (block) => block.id === blockId,
    );
    const previousBlock = editableOrder[currentIndex - 1];
    const hasChildren = (state.blocks ?? []).some(
      (block) => block.parentBlockId === blockId,
    );
    if (!previousBlock || hasChildren) return false;
    void state.removeBlock(blockId).then((removed) => {
      if (removed) setFocusTarget({ blockId: previousBlock.id });
    });
    return true;
  };

  return { splitBlockAtCaret, removeEmptyBlock };
}
