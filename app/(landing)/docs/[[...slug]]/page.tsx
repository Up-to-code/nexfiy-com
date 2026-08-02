import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { DocsActions } from "@/features/docs/DocsActions";
import { MarkdownDocument } from "@/features/docs/MarkdownDocument";
import { getDoc, getTableOfContents } from "@/features/docs/docs";
import { docsHref, docsManifest } from "@/features/docs/docs-manifest";

type DocsPageProps = { params: Promise<{ slug?: string[] }> };

function requestedSlug(slug?: string[]) {
  return slug?.join("/") || "overview";
}

export function generateStaticParams() {
  return docsManifest.map((entry) => ({
    slug: entry.slug === "overview" ? [] : entry.slug.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await getDoc(requestedSlug(slug));
  if (!document) return {};
  return {
    title: `${document.title} | Nexfiy Docs`,
    description: document.description,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const currentSlug = requestedSlug(slug);
  const document = await getDoc(currentSlug);
  if (!document) notFound();
  const index = docsManifest.findIndex((entry) => entry.slug === currentSlug);
  const previous = docsManifest[index - 1];
  const next = docsManifest[index + 1];
  const tableOfContents = getTableOfContents(document.content);

  return (
    <div className="mx-auto grid max-w-5xl xl:grid-cols-[minmax(0,1fr)_190px]">
      <main className="min-w-0 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="border-border/60 mb-9 border-b pb-7">
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">
            {document.section}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {document.title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
            {document.description}
          </p>
          <div className="mt-5">
            <DocsActions
              markdown={document.source}
              filename={`${document.slug.split("/").at(-1)}.md`}
            />
          </div>
        </div>

        <MarkdownDocument markdown={document.content} />

        <nav
          aria-label="Documentation pagination"
          className="border-border/60 mt-14 grid gap-3 border-t pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={docsHref(previous.slug)}
              className="border-border/70 hover:border-primary/30 hover:bg-muted/30 rounded-xl border p-4 transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <ArrowLeft className="size-3" /> Previous
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={docsHref(next.slug)}
              className="border-border/70 hover:border-primary/30 hover:bg-muted/30 rounded-xl border p-4 text-right transition-colors"
            >
              <span className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
                Next <ArrowRight className="size-3" />
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {next.title}
              </span>
            </Link>
          ) : null}
        </nav>
      </main>

      <aside className="hidden py-14 pr-6 xl:block">
        <div className="sticky top-24">
          <p className="mb-3 text-xs font-semibold">On this page</p>
          <nav className="border-border/70 space-y-2 border-l pl-3">
            {tableOfContents.map((heading) => (
              <Link
                key={heading.id}
                href={`#${heading.id}`}
                className={`text-muted-foreground hover:text-foreground block text-xs leading-5 transition-colors ${
                  heading.depth === 3 ? "pl-3" : ""
                }`}
              >
                {heading.title}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
