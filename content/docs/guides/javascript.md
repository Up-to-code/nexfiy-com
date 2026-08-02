---
title: Use Nexfiy with JavaScript
description: Fetch database content, follow cursors, and handle errors from a trusted JavaScript runtime.
---

Use the Content API from Node.js, a serverless function, a worker with secret storage, or another trusted JavaScript runtime.

## Create a small client

```js
const baseUrl = process.env.NEXFIY_URL;
const apiKey = process.env.NEXFIY_CONTENT_API_KEY;

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(
      detail?.message ?? `Nexfiy request failed (${response.status})`,
    );
  }

  return response.json();
}

const { data: databases } = await request("/api/contents");
console.log(databases);
```

## Follow pagination

```js
async function* iterateContent(databaseId, limit = 25) {
  let cursor;

  do {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);

    const page = await request(
      `/api/contents/${encodeURIComponent(databaseId)}?${query}`,
    );

    for (const item of page.data.items) yield item;
    cursor = page.meta.nextCursor ?? undefined;
  } while (cursor);
}

for await (const item of iterateContent("database_id")) {
  console.log(item);
}
```

## Fetch one item

```js
const item = await request(
  `/api/contents/${encodeURIComponent(databaseId)}/${encodeURIComponent(contentId)}`,
);
```

## Retry temporary failures

Retry `503` responses with exponential backoff and jitter. Do not automatically retry `400`, `401`, or `404` without changing the request or credential. For writes through MCP, confirm the result before retrying so an uncertain response does not create duplicate content.

## Browser warning

Do not put `NEXFIY_CONTENT_API_KEY` in browser code, local storage, a public environment variable, or a public repository. If a browser needs Nexfiy content, expose only the necessary data through your own authenticated server endpoint.

## Render blocks

Preserve block order, recursively render children, and provide fallbacks for unknown block types and failed embeds. The [Blocks and properties guide](/docs/content-api/blocks) includes link card, YouTube, and GitHub repository examples.
