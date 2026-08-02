"use client";

import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, PlusCircle, Table2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TemplateGalleryDialog } from "@/features/templates/TemplateGalleryDialog";
import { useBilling } from "@/features/billing/use-billing";
import { useSettings } from "@/hooks/useSettingsModal";

const DocumentsPage = () => {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const create = useMutation(api.documents.create);
  const createDatabase = useMutation(api.databases.create);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const billing = useBilling();
  const settings = useSettings();

  const onCreate = () => {
    const promise = create({ title: "Untitled" }).then((documentId) =>
      router.push(`/documents/${documentId}`),
    );

    toast.promise(promise, {
      loading: "Creating a new note....",
      success: "New note created!",
      error: "Failed to create a new note.",
    });
  };

  const onCreateDatabase = () => {
    if (!billing.subscription?.hasPro) {
      settings.onOpen("billing");
      return;
    }
    const promise = createDatabase({ title: "Untitled database" }).then(
      ({ documentId }) => router.push(`/documents/${documentId}`),
    );

    toast.promise(promise, {
      loading: "Creating a new database…",
      success: "Database created!",
      error: "Failed to create a database.",
    });
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="animate-in fade-in zoom-in-95 relative mb-2 duration-500">
        <Image
          src="/empty-workspace-light.png"
          alt="Empty workspace"
          height={768}
          width={768}
          priority
          className="relative size-60 object-contain sm:size-72 dark:hidden"
        />
        <Image
          src="/empty-workspace-dark.png"
          alt="Empty workspace"
          height={768}
          width={768}
          priority
          className="relative hidden size-60 object-contain sm:size-72 dark:block"
        />
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 max-w-md space-y-1.5 duration-500">
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Welcome to {session?.user.name ?? "your Nexfiy workspace"}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Start with a page or use a workspace template. Databases are included
          with Pro.
        </p>
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 mt-6 flex flex-wrap items-center justify-center gap-2.5 duration-700">
        <Button
          onClick={onCreate}
          className="h-9 rounded-md bg-[#2383E2] px-4 font-medium text-white shadow-xs hover:bg-[#1d6fc2]"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create a note
        </Button>
        <Button
          variant="outline"
          onClick={onCreateDatabase}
          className="border-border/60 hover:bg-muted/50 h-9 rounded-md font-medium"
        >
          <Table2 className="mr-2 h-4 w-4" />
          {billing.subscription?.hasPro
            ? "Create a database"
            : "Database · Pro"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsTemplateGalleryOpen(true)}
          className="border-border/60 hover:bg-muted/50 h-9 rounded-md font-medium"
        >
          <LayoutTemplate className="mr-2 h-4 w-4" />
          Use a template
        </Button>
      </div>
      <TemplateGalleryDialog
        open={isTemplateGalleryOpen}
        onOpenChange={setIsTemplateGalleryOpen}
      />
    </div>
  );
};
export default DocumentsPage;
