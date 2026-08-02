import { getAllDocs } from "@/features/docs/docs";

export async function GET() {
  const documents = await getAllDocs();
  const content = documents
    .filter((document) => document !== null)
    .map((document) => document.source)
    .join("\n\n---\n\n");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
