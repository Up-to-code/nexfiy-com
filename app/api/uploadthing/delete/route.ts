import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

const getCustomId = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!url.hostname.endsWith(".ufs.sh") && url.hostname !== "utfs.io")
    return null;
  const match = url.pathname.match(/^\/f\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await fetchAuthQuery(api.auth.getAuthUser, {}).catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urls =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { urls?: unknown }).urls)
      ? (body as { urls: unknown[] }).urls
      : null;
  if (
    !urls ||
    urls.length > 100 ||
    urls.some((url) => typeof url !== "string")
  ) {
    return NextResponse.json(
      { error: "Provide up to 100 file URLs" },
      { status: 400 },
    );
  }

  const customIds = urls
    .map((url) => getCustomId(url as string))
    .filter((id): id is string => Boolean(id));
  const ownerPrefix = `${user._id}--`;
  if (customIds.some((id) => !id.startsWith(ownerPrefix))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (customIds.length === 0) return NextResponse.json({ deletedCount: 0 });

  const result = await new UTApi().deleteFiles(customIds, {
    keyType: "customId",
  });
  return NextResponse.json({ deletedCount: result.deletedCount });
}
