"use client";

import dynamic from "next/dynamic";
import { use } from "react";

import { Cover } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { NormalizedBlockNoteEditor } from "@/features/blocks/NormalizedBlockNoteEditor";
import { DatabasePage } from "@/features/databases/DatabasePage";

interface DocumentIdPageProps {
  params: Promise<{
    documentId: Id<"documents">;
  }>;
}

const LegacyEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
});

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const { documentId } = use(params);

  const document = useQuery(api.documents.getById, {
    documentId: documentId,
  });

  if (document === undefined) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="mx-auto mt-10 md:max-w-3xl lg:max-w-4xl">
          <div className="space-y-4 pt-4 pl-8">
            <Skeleton className="h-14 w-1/2" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  if (document === null) {
    return <div>Not found</div>;
  }

  if (document.kind === "database") {
    return (
      <div className="pb-40">
        <Cover preview url={document.coverImage} />
        <DatabasePage document={document} preview />
      </div>
    );
  }

  return (
    <div className="pb-40">
      <Cover preview url={document.coverImage} />
      <div className="mx-auto md:max-w-3xl lg:max-w-4xl">
        <Toolbar
          preview
          initialData={document}
          editorFont={document.editorFont ?? "default"}
        />
        {document.contentModel === "page_blocks" ? (
          <NormalizedBlockNoteEditor
            pageId={document._id}
            editorFont={document.editorFont ?? "default"}
            smallText={document.smallText}
            editable={false}
          />
        ) : (
          <LegacyEditor
            editable={false}
            onChange={() => undefined}
            initialContent={document.content}
            editorFont={document.editorFont ?? "default"}
          />
        )}
      </div>
    </div>
  );
};
export default DocumentIdPage;
