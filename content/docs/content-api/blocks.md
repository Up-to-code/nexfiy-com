---
title: Canonical pages, blocks, and properties
description: Render the same structured page data that Nexfiy exposes to the workspace, Content API, blog renderer, and MCP.
---

Every item has one canonical shape: `id`, `title`, `icon`, `cover`, `parentId`, publication state, timestamps, `properties`, and—on the detail route—`blocks`.

`cover` is the page cover edited in Nexfiy. It is not a separate database property. A missing cover is `null`.

## Properties

The `properties` array contains typed database values joined by `propertyId`. The database schema response supplies each property's name, type, and select options. List and detail responses use the same property-value shape.

## Blocks

Blocks are ordered by `order` and nested with `parentId`. Editor implementation details such as BlockNote JSON are never part of the public contract.

Text blocks use `text`. Checklists additionally use `checked`; callouts may use `color`.

### Labeled link

```json
{
  "type": "link",
  "label": "API reference",
  "href": "https://example.com/api"
}
```

Render `label` as the visible text and `href` as the destination. Both values are editable in the page.

### Image

```json
{
  "type": "image",
  "src": "https://cdn.example.com/workflow.webp",
  "alt": "Workflow from draft to published",
  "caption": "The publishing workflow"
}
```

Use `alt` for accessibility and show `caption` when present. Both fields originate from user-visible page metadata.

### File

Files use `src` for the downloadable asset and `label` for the visible name.

## Rendering rules

- Preserve block order and recursively group blocks by `parentId`.
- Escape text and sanitize any HTML introduced by your renderer.
- Lazy-load media and reserve its aspect ratio.
- Open external links with safe `rel` attributes.
- Provide a visible unsupported-block fallback for an unknown `type`.

For complete payloads, continue to [Complete API examples](/docs/content-api/examples).
