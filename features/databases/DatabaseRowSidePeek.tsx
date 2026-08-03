"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";

import type { useDatabase } from "./useDatabase";
import { DatabaseRowContent } from "./DatabaseRowContent";

type DatabaseData = NonNullable<ReturnType<typeof useDatabase>["database"]>;

export function DatabaseRowSidePeek({
  database,
  rowId,
  onClose,
  onUpdateTitle,
  onSetValue,
  onAddSelectOption,
  onCreateTemplate,
}: {
  database: DatabaseData;
  rowId?: Id<"documents">;
  onClose: () => void;
  onUpdateTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onAddSelectOption: ReturnType<typeof useDatabase>["addSelectOption"];
  onCreateTemplate: ReturnType<typeof useDatabase>["createRowTemplate"];
}) {
  if (!rowId) return null;
  const row = database.rows.find((candidate) => candidate.id === rowId);
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={row.title || "Database page"}
        className="bg-background absolute inset-y-0 right-0 w-[min(760px,72vw)] min-w-[420px] overflow-y-auto border-l shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="bg-background/95 sticky top-0 z-10 flex h-12 items-center justify-between border-b px-3 backdrop-blur">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/documents/${row.id}`}>
                <ExternalLink className="size-3.5" /> Open full page
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const name = window.prompt("Template name", row.title)?.trim();
                if (name) {
                  void onCreateTemplate({
                    dataSourceId: database.dataSource.id,
                    documentId: row.id,
                    name,
                  });
                }
              }}
            >
              Save as template
            </Button>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </header>
        <DatabaseRowContent
          database={database}
          rowId={row.id}
          onUpdateTitle={onUpdateTitle}
          onSetValue={onSetValue}
          onAddSelectOption={onAddSelectOption}
        />
      </section>
    </div>
  );
}
