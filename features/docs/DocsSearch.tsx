"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { docsHref, docsManifest, docsSections } from "./docs-manifest";

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const currentSlug =
    pathname === "/docs" ? "overview" : pathname.replace(/^\/docs\/?/, "");
  const normalized = query.trim().toLocaleLowerCase();
  const results = normalized
    ? docsManifest.filter((entry) =>
        `${entry.title} ${entry.description} ${entry.section}`
          .toLocaleLowerCase()
          .includes(normalized),
      )
    : docsManifest;

  return (
    <div>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-3.5" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search docs…"
          aria-label="Search documentation"
          className="h-9 rounded-lg pl-9 text-sm shadow-none"
        />
      </div>
      <nav aria-label="Documentation" className="mt-5 space-y-5">
        {docsSections.map((section) => {
          const entries = results.filter((entry) => entry.section === section);
          if (!entries.length) return null;
          return (
            <div key={section}>
              <p className="text-muted-foreground mb-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase">
                {section}
              </p>
              <div className="space-y-0.5">
                {entries.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={docsHref(entry.slug)}
                    className={cn(
                      "block rounded-lg px-2.5 py-2 text-sm transition-colors",
                      currentSlug === entry.slug
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {entry.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {results.length === 0 ? (
          <p className="text-muted-foreground px-2 text-sm">No guides found.</p>
        ) : null}
      </nav>
    </div>
  );
}
