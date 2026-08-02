---
title: Use Nexfiy with Next.js
description: Fetch published workspace content safely from a Next.js server component.
---

Keep the API key on the server and fetch Nexfiy content from a server component or route handler.

## Configure the secret

```bash
# .env.local
NEXFIY_URL=https://your-nexfiy-host.com
NEXFIY_CONTENT_API_KEY=nxf_your_secret_key
```

Do not prefix the key with `NEXT_PUBLIC_`.

## Create a server-only client

```ts
// lib/nexfiy.ts
import "server-only";

const baseUrl = process.env.NEXFIY_URL;
const apiKey = process.env.NEXFIY_CONTENT_API_KEY;

async function nexfiyFetch<T>(path: string): Promise<T> {
  if (!baseUrl || !apiKey) throw new Error("Nexfiy is not configured");

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Nexfiy request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function listSources() {
  return nexfiyFetch<{ data: Source[]>("/api/contents");
}

export function listContent(databaseId: string) {
  return nexfiyFetch<ContentPage>(
    `/api/contents/${encodeURIComponent(databaseId)}?limit=25`,
  );
}
```

Define `Source` and `ContentPage` from the payload fields your UI consumes. Allow additional fields so the client remains forward-compatible.

## Render in a server component

```tsx
// app/knowledge/page.tsx
import { listContent, listSources } from "@/lib/nexfiy";

export default async function KnowledgePage() {
  const { data: sources } = await listSources();
  const source = sources[0];

  if (!source) return <p>No database is available for this API key.</p>;

  const page = await listContent(source.id);

  return (
    <main>
      <h1>{source.title}</h1>
      <pre>{JSON.stringify(page.data, null, 2)}</pre>
    </main>
  );
}
```

Replace the `<pre>` with typed components for properties and blocks. See [Blocks and properties](/docs/content-api/blocks).

## Caching choices

- Use `next: { revalidate: seconds }` for content that may be briefly cached.
- Use `cache: "no-store"` for always-fresh or user-specific server responses.
- Do not combine conflicting `fetch` caching options.
- Invalidate your own application cache after an editorial publishing workflow if immediate updates are required.

## Dynamic database selection

Call `/api/contents` first and select by a stable ID. For an internal admin UI, you can show the returned sources in a server-rendered selector. Never send the API key to that selector's browser code.
