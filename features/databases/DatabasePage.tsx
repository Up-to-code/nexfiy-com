"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { Toolbar } from "@/components/toolbar";

import { DatabaseTable } from "./DatabaseTable";

export function DatabasePage({
  document,
  preview = false,
}: {
  document: Doc<"documents">;
  preview?: boolean;
}) {
  return (
    <div className="mx-auto w-[94%] max-w-[1600px]">
      <Toolbar
        preview={preview}
        initialData={document}
        editorFont={document.editorFont}
      />
      <DatabaseTable documentId={document._id} readOnly={preview} />
    </div>
  );
}
