import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.NEXFIY_MCP_TEST_URL;
const pageId = process.env.NEXFIY_MCP_PAGE_ID;
if (!endpoint || !pageId) {
  throw new Error("Set NEXFIY_MCP_TEST_URL and NEXFIY_MCP_PAGE_ID");
}

const client = new Client({ name: "nexfiy-page-inspector", version: "1.0.0" });

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const listed = await client.callTool({
    name: "list_documents",
    arguments: { limit: 50 },
  });
  if (listed.isError) throw new Error("list_documents failed");
  const documents = listed.structuredContent?.documents ?? [];
  const page = documents.find((document) => document.id === pageId);
  const children = documents.filter((document) => document.parentId === pageId);
  console.log(JSON.stringify({ page, children }, null, 2));
} finally {
  await client.close();
}
