"use client";

import { useState } from "react";
import Link from "next/link";
import { BookTemplate, ExternalLink, MoreHorizontal, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  onDeleteRows,
}: {
  database: DatabaseData;
  rowId?: Id<"documents">;
  onClose: () => void;
  onUpdateTitle: ReturnType<typeof useDatabase>["updateRowTitle"];
  onSetValue: ReturnType<typeof useDatabase>["setValue"];
  onAddSelectOption: ReturnType<typeof useDatabase>["addSelectOption"];
  onCreateTemplate: ReturnType<typeof useDatabase>["createRowTemplate"];
  onDeleteRows: ReturnType<typeof useDatabase>["deleteRows"];
}) {
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  if (!rowId) return null;
  const row = database.rows.find((candidate) => candidate.id === rowId);
  if (!row) return null;

  const openTemplateDialog = () => {
    setTemplateName(row.title);
    setIsTemplateOpen(true);
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await onDeleteRows([row.id]);
    setIsDeleting(false);
    if (ok) onClose();
  };

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
            <Button variant="ghost" size="sm" onClick={openTemplateDialog}>
              Save as template
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Row actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={`/documents/${row.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Open full page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openTemplateDialog}>
                  <BookTemplate className="mr-2 h-4 w-4" /> Save as template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  disabled={isDeleting}
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Moving to trash…" : "Move to Trash"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>
        <DatabaseRowContent
          database={database}
          rowId={row.id}
          onUpdateTitle={onUpdateTitle}
          onSetValue={onSetValue}
          onAddSelectOption={onAddSelectOption}
        />
      </section>
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save row as template</DialogTitle>
            <DialogDescription>
              Reuse this row&apos;s properties and page content in this database.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="Template name"
            maxLength={80}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!templateName.trim()}
              onClick={async () => {
                const saved = await onCreateTemplate({
                  dataSourceId: database.dataSource.id,
                  documentId: row.id,
                  name: templateName.trim(),
                });
                if (saved) setIsTemplateOpen(false);
              }}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
