export type DocsEntry = {
  slug: string;
  title: string;
  description: string;
  section: "Start" | "Content API" | "MCP" | "Guides";
};

export const docsManifest: DocsEntry[] = [
  {
    slug: "overview",
    title: "Documentation",
    description: "Connect Nexfiy content to apps, agents, and automations.",
    section: "Start",
  },
  {
    slug: "content-api/quickstart",
    title: "Content API quickstart",
    description: "Create a scoped key and fetch your first database.",
    section: "Content API",
  },
  {
    slug: "content-api/reference",
    title: "API reference",
    description: "Routes, authentication, pagination, and response shapes.",
    section: "Content API",
  },
  {
    slug: "content-api/blocks",
    title: "Blocks and properties",
    description: "Render database values and every normalized content block.",
    section: "Content API",
  },
  {
    slug: "content-api/examples",
    title: "Complete API examples",
    description: "Database payloads, block trees, links, YouTube, and GitHub.",
    section: "Content API",
  },
  {
    slug: "mcp/quickstart",
    title: "MCP quickstart",
    description: "Connect Codex, Claude Code, or another MCP client.",
    section: "MCP",
  },
  {
    slug: "mcp/tools",
    title: "MCP tools",
    description: "The complete Nexfiy tool catalog and safety behavior.",
    section: "MCP",
  },
  {
    slug: "mcp/images",
    title: "Upload images with MCP",
    description: "Upload workspace-owned assets and create image blocks.",
    section: "MCP",
  },
  {
    slug: "guides/nextjs",
    title: "Use Nexfiy with Next.js",
    description: "Fetch content securely and render a content collection.",
    section: "Guides",
  },
  {
    slug: "guides/javascript",
    title: "JavaScript and automation",
    description:
      "Use the API from trusted JavaScript runtimes and scheduled jobs.",
    section: "Guides",
  },
];

export const docsSections = ["Start", "Content API", "MCP", "Guides"] as const;

export function docsHref(slug: string) {
  return slug === "overview" ? "/docs" : `/docs/${slug}`;
}
