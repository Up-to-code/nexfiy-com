"use client";

import { useEffect, useSyncExternalStore } from "react";
import { File } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/useSearch";
import { api } from "@/convex/_generated/api";
import { DialogTitle } from "./ui/dialog";
import { captureEvent } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const SearchCommand = () => {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const documents = useQuery(api.documents.getSearch);
  const { t } = useI18n();
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        captureEvent("workspace_search_opened", { source: "keyboard" });
        toggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const onSelect = (id: string) => {
    captureEvent("workspace_search_result_selected", {});
    router.push(`/documents/${id}`);
    onClose();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle hidden>{t("app.searchDocuments")}</DialogTitle>
      <Command
        loop
        filter={(value, search) => {
          const [documentTitle = ""] = value.split("|");
          if (documentTitle.toLowerCase().includes(search.toLowerCase()))
            return 1;
          return 0;
        }}
      >
        <CommandInput
          placeholder={t("app.searchPlaceholder", {
            name: session?.user.name ?? "",
          })}
        />
        <CommandList>
          <CommandEmpty>{t("app.searchEmpty")}</CommandEmpty>
          <CommandGroup heading={t("app.searchDocuments")} className="pb-1">
            {documents?.map((document) => (
              <CommandItem
                key={document._id}
                value={`${document.title}|${document._id}`}
                title={document.title}
                onSelect={() => onSelect(document._id)}
              >
                {document.icon ? (
                  <p className="mr-2 text-[1.125rem] leading-0">
                    {document.icon}
                  </p>
                ) : (
                  <File className="mr-2 h-4 w-4" />
                )}
                <span>{document.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};
