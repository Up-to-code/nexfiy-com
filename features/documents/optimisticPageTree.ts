import type { OptimisticLocalStore } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type PagePlacement = "before" | "after" | "inside";

type MovePageArgs = {
  id: Id<"documents">;
  targetId: Id<"documents">;
  placement: PagePlacement;
};

function sameParent(left?: Id<"documents">, right?: Id<"documents">) {
  return left === right;
}

function normalizePageOrders(pages: Doc<"documents">[]) {
  return pages.map((page, order) => ({ ...page, order }));
}

function patchPageEverywhere(
  store: OptimisticLocalStore,
  pageId: Id<"documents">,
  patch: Partial<Doc<"documents">>,
) {
  for (const query of store.getAllQueries(api.documents.getById)) {
    if (query.value?._id !== pageId) continue;
    store.setQuery(api.documents.getById, query.args, {
      ...query.value,
      ...patch,
    });
  }

  for (const query of store.getAllQueries(api.documents.getFavorites)) {
    if (!query.value?.some((page) => page._id === pageId)) continue;
    store.setQuery(
      api.documents.getFavorites,
      query.args,
      query.value.map((page) =>
        page._id === pageId ? { ...page, ...patch } : page,
      ),
    );
  }
}

export function optimisticallyMovePage(
  store: OptimisticLocalStore,
  args: MovePageArgs,
) {
  const sidebarQueries = store.getAllQueries(api.documents.getSidebar);
  const loadedPages = sidebarQueries.flatMap((query) => query.value ?? []);
  const page = loadedPages.find((candidate) => candidate._id === args.id);
  const target = loadedPages.find(
    (candidate) => candidate._id === args.targetId,
  );
  if (!page || !target || page._id === target._id) return;

  const nextParent =
    args.placement === "inside" ? target._id : target.parentDocument;
  const movedPage = {
    ...page,
    parentDocument: nextParent,
    updatedAt: Date.now(),
  };

  for (const query of sidebarQueries) {
    if (!query.value) continue;
    const isSource = query.value.some(
      (candidate) => candidate._id === page._id,
    );
    const isDestination = sameParent(query.args.parentDocument, nextParent);
    if (!isSource && !isDestination) continue;

    const nextPages = query.value.filter(
      (candidate) => candidate._id !== page._id,
    );
    if (isDestination) {
      const targetIndex = nextPages.findIndex(
        (candidate) => candidate._id === target._id,
      );
      const insertionIndex =
        args.placement === "inside"
          ? nextPages.length
          : Math.max(0, targetIndex + (args.placement === "after" ? 1 : 0));
      nextPages.splice(insertionIndex, 0, movedPage);
    }

    store.setQuery(
      api.documents.getSidebar,
      query.args,
      normalizePageOrders(nextPages),
    );
  }

  patchPageEverywhere(store, page._id, {
    parentDocument: nextParent,
    updatedAt: movedPage.updatedAt,
  });
}

export function optimisticallyReparentPage(
  store: OptimisticLocalStore,
  pageId: Id<"documents">,
  nextParent: Id<"documents">,
) {
  const sidebarQueries = store.getAllQueries(api.documents.getSidebar);
  const loadedPages = sidebarQueries.flatMap((query) => query.value ?? []);
  const page = loadedPages.find((candidate) => candidate._id === pageId);
  const fallback = store
    .getAllQueries(api.documents.getById)
    .find((query) => query.value?._id === pageId)?.value;
  const currentPage = page ?? fallback;
  if (!currentPage) return;

  const movedPage = {
    ...currentPage,
    parentDocument: nextParent,
    updatedAt: Date.now(),
  };

  for (const query of sidebarQueries) {
    if (!query.value) continue;
    const isSource = query.value.some(
      (candidate) => candidate._id === currentPage._id,
    );
    const isDestination = sameParent(query.args.parentDocument, nextParent);
    if (!isSource && !isDestination) continue;
    const nextPages = query.value.filter(
      (candidate) => candidate._id !== currentPage._id,
    );
    if (isDestination) nextPages.push(movedPage);
    store.setQuery(
      api.documents.getSidebar,
      query.args,
      normalizePageOrders(nextPages),
    );
  }

  patchPageEverywhere(store, pageId, {
    parentDocument: nextParent,
    updatedAt: movedPage.updatedAt,
  });
}
