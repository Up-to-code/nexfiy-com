import { docsHref, docsManifest } from "@/features/docs/docs-manifest";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const lines = [
    "# Nexfiy",
    "",
    "> Public developer documentation for the Nexfiy Content API and MCP server.",
    "",
    ...docsManifest.map(
      (entry) =>
        `- [${entry.title}](${origin}${docsHref(entry.slug)}): ${entry.description}`,
    ),
    "",
    `- [Complete Markdown bundle](${origin}/llms-full.txt)`,
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
