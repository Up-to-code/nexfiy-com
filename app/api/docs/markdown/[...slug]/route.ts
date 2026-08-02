import { getDoc } from "@/features/docs/docs";

type RouteContext = { params: Promise<{ slug: string[] }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const document = await getDoc(slug.join("/"));
  if (!document) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(document.source, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.slug.split("/").at(-1)}.md"`,
    },
  });
}
