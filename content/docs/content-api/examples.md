---
title: Complete API examples
description: Copyable database payloads and rendering helpers for properties, nested blocks, links, YouTube, and GitHub.
---

These examples match the current Content API response envelope and normalized block storage model.

## List databases

```bash
curl "$NEXFIY_URL/api/contents" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

```json
{
  "data": [
    {
      "id": "database_id",
      "documentId": "database_document_id",
      "name": "Engineering knowledge",
      "icon": "🧭",
      "updatedAt": 1785661200000
    }
  ],
  "meta": { "count": 1 }
}
```

Use `data[].id` as `databaseId` in later requests.

## List database items

```bash
curl "$NEXFIY_URL/api/contents/database_id?limit=25" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

```json
{
  "data": {
    "source": {
      "id": "database_id",
      "documentId": "database_document_id",
      "name": "Engineering knowledge",
      "icon": "🧭",
      "updatedAt": 1785661200000
    },
    "schema": [
      {
        "id": "property_status",
        "name": "Status",
        "type": "status",
        "order": 0,
        "options": [
          {
            "id": "option_published",
            "name": "Published",
            "color": "green",
            "order": 0
          }
        ]
      },
      {
        "id": "property_url",
        "name": "Website",
        "type": "url",
        "order": 1,
        "options": []
      }
    ],
    "items": [
      {
        "id": "content_id",
        "title": "API rendering guide",
        "icon": "📄",
        "updatedAt": 1785661200000,
        "values": [
          {
            "propertyId": "property_status",
            "type": "status",
            "text": null,
            "number": null,
            "boolean": null,
            "dateStart": null,
            "dateEnd": null,
            "optionIds": ["option_published"]
          },
          {
            "propertyId": "property_url",
            "type": "url",
            "text": "https://example.com/guide",
            "number": null,
            "boolean": null,
            "dateStart": null,
            "dateEnd": null,
            "optionIds": []
          }
        ]
      }
    ]
  },
  "meta": {
    "isDone": true,
    "nextCursor": null
  }
}
```

## Join values to the schema

Values reference properties and select options by ID. Join them locally to produce display-ready fields.

```ts
function displayValues(schema: Property[], values: PropertyValue[]) {
  const valuesByProperty = new Map(
    values.map((value) => [value.propertyId, value]),
  );

  return schema.map((property) => {
    const value = valuesByProperty.get(property.id);
    const selectedOptions = property.options.filter((option) =>
      value?.optionIds.includes(option.id),
    );

    return {
      name: property.name,
      type: property.type,
      value,
      selectedOptions,
    };
  });
}
```

## Get an item with blocks

```bash
curl "$NEXFIY_URL/api/contents/database_id/content_id" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

```json
{
  "data": {
    "source": {
      "id": "database_id",
      "documentId": "database_document_id",
      "name": "Engineering knowledge",
      "icon": "🧭",
      "updatedAt": 1785661200000
    },
    "item": {
      "id": "content_id",
      "title": "API rendering guide",
      "icon": "📄",
      "updatedAt": 1785661200000,
      "content": null,
      "contentModel": "page_blocks",
      "blocks": [
        {
          "id": "block_heading",
          "editorId": "editor_heading",
          "parentBlockId": null,
          "type": "heading_2",
          "order": 0,
          "text": "Useful resources",
          "checked": null,
          "url": null,
          "color": null,
          "propsJson": null,
          "dataSourceId": null,
          "viewId": null,
          "linkedContentId": null,
          "syncGroupId": null
        },
        {
          "id": "block_link",
          "editorId": "editor_link",
          "parentBlockId": null,
          "type": "blocknote",
          "order": 1,
          "text": null,
          "checked": null,
          "url": null,
          "color": null,
          "propsJson": "{\"type\":\"linkCard\",\"props\":{\"label\":\"API reference\",\"url\":\"https://example.com/api\"},\"content\":[]}",
          "dataSourceId": null,
          "viewId": null,
          "linkedContentId": null,
          "syncGroupId": null
        },
        {
          "id": "block_youtube",
          "editorId": "editor_youtube",
          "parentBlockId": null,
          "type": "blocknote",
          "order": 2,
          "text": null,
          "checked": null,
          "url": null,
          "color": null,
          "propsJson": "{\"type\":\"youtubeEmbed\",\"props\":{\"url\":\"https://www.youtube.com/watch?v=VIDEO_ID\"},\"content\":[]}",
          "dataSourceId": null,
          "viewId": null,
          "linkedContentId": null,
          "syncGroupId": null
        },
        {
          "id": "block_github",
          "editorId": "editor_github",
          "parentBlockId": null,
          "type": "blocknote",
          "order": 3,
          "text": null,
          "checked": null,
          "url": null,
          "color": null,
          "propsJson": "{\"type\":\"githubRepository\",\"props\":{\"url\":\"https://github.com/owner/repository\"},\"content\":[]}",
          "dataSourceId": null,
          "viewId": null,
          "linkedContentId": null,
          "syncGroupId": null
        }
      ],
      "blocksTruncated": false
    }
  }
}
```

If `blocksTruncated` is true, the item contains more than the endpoint's current 1,000-block response limit.

## Parse custom cards

```ts
type CustomBlock = {
  type: "linkCard" | "youtubeEmbed" | "githubRepository" | string;
  props: Record<string, unknown>;
  content?: unknown;
};

function parseCustomBlock(block: NexfiyBlock): CustomBlock | null {
  if (block.type !== "blocknote" || !block.propsJson) return null;

  try {
    return JSON.parse(block.propsJson) as CustomBlock;
  } catch {
    return null;
  }
}

function customBlockLabel(custom: CustomBlock) {
  if (custom.type === "linkCard") {
    return String(custom.props.label || custom.props.url || "Link");
  }

  if (custom.type === "githubRepository") {
    const url = new URL(String(custom.props.url));
    return url.pathname.replace(/^\//, "") || url.hostname;
  }

  if (custom.type === "youtubeEmbed") return "Watch on YouTube";
  return "Unsupported block";
}
```

Only create an iframe from a validated YouTube video ID. Keep the original URL as a visible fallback link. For GitHub, render `owner/repository` and the original URL; live stars, language, or issue counts require a separate GitHub API integration.

## Build a nested block tree

The API returns a flat, ordered block array. Use `parentBlockId` to restore columns, toggles, and other nested structures.

```ts
type BlockNode = NexfiyBlock & { children: BlockNode[] };

function blockTree(blocks: NexfiyBlock[]): BlockNode[] {
  const nodes = new Map(
    blocks.map((block) => [block.id, { ...block, children: [] }]),
  );
  const roots: BlockNode[] = [];

  for (const block of [...blocks].sort((a, b) => a.order - b.order)) {
    const node = nodes.get(block.id)!;
    const parent = block.parentBlockId
      ? nodes.get(block.parentBlockId)
      : undefined;

    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}
```

## Production checklist

- Fetch from a trusted server runtime so the API key never reaches the browser.
- Discover selected databases through `/api/contents` instead of hard-coding names.
- Join values, properties, and select options by ID.
- Follow `meta.nextCursor` until it is `null`.
- Preserve block order and rebuild nesting with `parentBlockId`.
- Parse `propsJson` defensively and treat unknown custom block types as links or plain text.
- Sanitize user-controlled text and validate every external URL.
- Respect `blocksTruncated` and display a clear fallback for oversized pages.
