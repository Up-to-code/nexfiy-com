import type { OptimisticLocalStore } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { optimisticallyReparentPage } from "@/features/documents/optimisticPageTree";

type MoveBlockArgs = {
  blockId: Id<"pageBlocks">;
  targetPageId: Id<"documents">;
  targetBlockId?: Id<"pageBlocks">;
  placement: "before" | "after" | "inside";
};

export function optimisticallyMoveBlock(
  store: OptimisticLocalStore,
  args: MoveBlockArgs,
) {
  const pageQueries = store.getAllQueries(api.pageBlocks.list);
  const sourceQuery = pageQueries.find((query) =>
    query.value?.some((block) => block.id === args.blockId),
  );
  const sourceBlocks = sourceQuery?.value;
  const block = sourceBlocks?.find(
    (candidate) => candidate.id === args.blockId,
  );
  if (!sourceBlocks || !block) return;

  const targetQuery = pageQueries.find(
    (query) => query.args.pageId === args.targetPageId,
  );
  const targetBlocks = targetQuery?.value;
  const target = targetBlocks?.find(
    (candidate) => candidate.id === args.targetBlockId,
  );
  if (args.targetBlockId && !target) return;

  const subtreeIds = new Set<string>([block.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of sourceBlocks) {
      if (
        candidate.parentBlockId &&
        subtreeIds.has(candidate.parentBlockId) &&
        !subtreeIds.has(candidate.id)
      ) {
        subtreeIds.add(candidate.id);
        changed = true;
      }
    }
  }

  const nextParent =
    args.placement === "inside" ? target?.id : target?.parentBlockId;
  const oldParent = block.parentBlockId;
  const movingAcrossPages = block.pageId !== args.targetPageId;

  for (const query of pageQueries) {
    if (!query.value) continue;
    const isSource = query.args.pageId === block.pageId;
    const isDestination = query.args.pageId === args.targetPageId;
    if (!isSource && !isDestination) continue;

    let nextBlocks = query.value.filter(
      (candidate) => !subtreeIds.has(candidate.id),
    );

    if (isSource) {
      const previousSiblings = nextBlocks
        .filter((candidate) => candidate.parentBlockId === oldParent)
        .sort((left, right) => left.order - right.order);
      const previousOrders = new Map(
        previousSiblings.map((candidate, order) => [candidate.id, order]),
      );
      nextBlocks = nextBlocks.map((candidate) =>
        previousOrders.has(candidate.id)
          ? { ...candidate, order: previousOrders.get(candidate.id)! }
          : candidate,
      );
    }

    if (isDestination) {
      const destinationSiblings = nextBlocks
        .filter((candidate) => candidate.parentBlockId === nextParent)
        .sort((left, right) => left.order - right.order);
      const targetIndex = target
        ? destinationSiblings.findIndex(
            (candidate) => candidate.id === target.id,
          )
        : destinationSiblings.length - 1;
      const insertionIndex = target
        ? Math.max(0, targetIndex + (args.placement === "after" ? 1 : 0))
        : destinationSiblings.length;
      const movedRoot = {
        ...block,
        pageId: args.targetPageId,
        parentBlockId: nextParent,
        order: insertionIndex,
      };
      destinationSiblings.splice(insertionIndex, 0, movedRoot);
      const destinationOrders = new Map(
        destinationSiblings.map((candidate, order) => [candidate.id, order]),
      );
      nextBlocks = nextBlocks.map((candidate) =>
        destinationOrders.has(candidate.id)
          ? { ...candidate, order: destinationOrders.get(candidate.id)! }
          : candidate,
      );
      const descendants = sourceBlocks
        .filter(
          (candidate) =>
            candidate.id !== block.id && subtreeIds.has(candidate.id),
        )
        .map((candidate) => ({
          ...candidate,
          pageId: movingAcrossPages ? args.targetPageId : candidate.pageId,
        }));
      nextBlocks.push(movedRoot, ...descendants);
    }

    store.setQuery(api.pageBlocks.list, query.args, nextBlocks);
  }

  if (movingAcrossPages && block.type === "child_page" && block.linkedPageId) {
    optimisticallyReparentPage(store, block.linkedPageId, args.targetPageId);
  }
}
