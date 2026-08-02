"use client";

import { useState } from "react";
import { Check, Clipboard, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard access was denied");
  }
}

export function DocsActions({
  markdown,
  filename,
}: {
  markdown: string;
  filename: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyMarkdown = async () => {
    try {
      await writeClipboard(markdown);
      setCopied(true);
      toast.success("Markdown copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy Markdown. Try Download .md instead.");
    }
  };

  const downloadMarkdown = () => {
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={copyMarkdown}>
        {copied ? <Check /> : <Clipboard />}
        {copied ? "Copied" : "Copy Markdown"}
      </Button>
      <Button variant="ghost" size="sm" onClick={downloadMarkdown}>
        <Download /> Download .md
      </Button>
    </div>
  );
}
