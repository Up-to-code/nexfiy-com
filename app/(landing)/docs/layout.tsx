import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

import { DocsSearch } from "@/features/docs/DocsSearch";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-[calc(100vh-4rem)]">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-border/60 hidden border-r lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-5 py-7">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground mb-5 flex items-center gap-2 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Back to Nexfiy
            </Link>
            <div className="mb-5 flex items-center gap-2 px-1">
              <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <BookOpen className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Developer docs</p>
                <p className="text-muted-foreground text-[11px]">API + MCP</p>
              </div>
            </div>
            <DocsSearch />
          </div>
        </aside>
        <div className="min-w-0">
          <details className="border-border/60 border-b px-4 py-3 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
              <BookOpen className="text-primary size-4" /> Browse documentation
            </summary>
            <div className="pt-4 pb-2">
              <DocsSearch />
            </div>
          </details>
          {children}
        </div>
      </div>
    </div>
  );
}
