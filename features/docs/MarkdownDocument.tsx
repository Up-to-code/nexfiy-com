import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { MarkdownAsync, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { codeToHtml, type BundledLanguage } from "shiki";

import { headingId } from "./docs";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

async function Code({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const language = className?.replace("language-", "");
  const value = nodeText(children).replace(/\n$/, "");
  if (!language) {
    return (
      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.86em]">
        {children}
      </code>
    );
  }

  let html: string;
  try {
    html = await codeToHtml(value, {
      lang: language as BundledLanguage,
      themes: { light: "github-light", dark: "github-dark" },
    });
  } catch {
    html = await codeToHtml(value, {
      lang: "text",
      themes: { light: "github-light", dark: "github-dark" },
    });
  }
  return (
    <div className="docs-code" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

const components: Components = {
  h2: ({ children }) => (
    <h2 id={headingId(nodeText(children))} className="scroll-mt-24">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 id={headingId(nodeText(children))} className="scroll-mt-24">
      {children}
    </h3>
  ),
  a: ({ href = "", children, ...props }) => {
    const external = href.startsWith("http");
    return (
      <Link
        href={href}
        {...props}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {children}
      </Link>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children, ...props }) => (
    <div className="docs-table" role="region" aria-label="Scrollable table">
      <table {...props}>{children}</table>
    </div>
  ),
  code: Code,
};

export async function MarkdownDocument({ markdown }: { markdown: string }) {
  return (
    <article className="docs-prose">
      <MarkdownAsync remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </MarkdownAsync>
    </article>
  );
}
