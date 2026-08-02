"use client";

import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";

import { optimisticallyMovePage } from "./optimisticPageTree";

export function usePageTreeMutations() {
  const movePage = useMutation(api.documents.movePage).withOptimisticUpdate(
    optimisticallyMovePage,
  );

  return { movePage };
}
