---
title: Complete API examples
description: Copyable examples for canonical page covers, properties, links, images, and blocks.
---

## List database content

```bash
curl "$NEXFIY_URL/api/contents/database_id?limit=25" \
  -H "Authorization: Bearer $NEXFIY_CONTENT_KEY"
```

```json
{
  "data": {
    "source": { "id": "database_id", "name": "Blog" },
    "schema": [],
    "items": [
      {
        "id": "content_id",
        "title": "Canonical content",
        "icon": "🧩",
        "cover": "https://cdn.example.com/cover.webp",
        "parentId": "database_page_id",
        "isPublished": true,
        "createdAt": 1785744000000,
        "updatedAt": 1785747600000,
        "properties": []
      }
    ],
    "continueCursor": null,
    "isDone": true
  }
}
```

## Get one item

```bash
curl "$NEXFIY_URL/api/contents/database_id/content_id" \
  -H "Authorization: Bearer $NEXFIY_CONTENT_KEY"
```

```json
{
  "data": {
    "item": {
      "id": "content_id",
      "title": "Canonical content",
      "cover": "https://cdn.example.com/cover.webp",
      "properties": [],
      "blocks": [
        {
          "id": "block_1",
          "parentId": null,
          "type": "link",
          "order": 0,
          "label": "API reference",
          "href": "https://example.com/api",
          "src": null,
          "alt": null,
          "caption": null
        },
        {
          "id": "block_2",
          "parentId": null,
          "type": "image",
          "order": 1,
          "label": null,
          "href": null,
          "src": "https://cdn.example.com/workflow.webp",
          "alt": "Product publishing workflow",
          "caption": "Draft to published"
        }
      ],
      "blocksTruncated": false
    }
  }
}
```

Join `properties` to `schema` by `propertyId`. Render blocks by `type`; never parse editor-specific JSON.
