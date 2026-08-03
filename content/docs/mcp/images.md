---
title: Upload images with MCP
description: Upload workspace-owned images and place them in Nexfiy pages, covers, databases, and public Content API experiences.
---

Nexfiy MCP clients can upload an image into the current workspace instead of relying on a temporary local path or a file committed to an application's `public` directory. The resulting asset URL is durable, workspace-owned, and can be reused by page blocks, covers, database properties, and Content API consumers.

## Upload and insert an image block

Call `upload_image` with base64-encoded image bytes. Include `pageId` when the image should be appended to a dynamic page immediately.

```json
{
  "fileName": "product-workflow.png",
  "dataBase64": "<base64 image bytes>",
  "altText": "Product workflow from draft to published content",
  "pageId": "<document id>"
}
```

The tool returns the normalized uploaded asset and, when `pageId` is present, the created `image` block.

```json
{
  "image": {
    "url": "https://...ufs.sh/f/<workspace-owned-id>",
    "width": 1600,
    "height": 900,
    "size": 184320,
    "mimeType": "image/webp"
  },
  "block": {
    "type": "image",
    "src": "https://...ufs.sh/f/<workspace-owned-id>",
    "alt": "Product workflow from draft to published content",
    "caption": null
  }
}
```

The server validates the image, removes embedded metadata, constrains large dimensions, and stores a WebP derivative. The decoded input limit is 3 MB. Supply meaningful `altText`; Nexfiy exposes it as the image block's editable `alt` field.

## Upload once, reuse the URL

Omit `pageId` when the asset is intended for a cover or database property. Then pass the returned `image.url` to the appropriate write tool:

- `update_document` with `cover` to use the asset as the page's canonical cover.
- `create_page_blocks` with `type: "image"`, `url`, `alt`, and optional `caption`.
- `update_page_block` to replace an existing image block's URL or visible metadata.

## Recommended agent workflow

1. Use `search_documents`, `get_document`, or `get_database` to resolve the target IDs.
2. Read and encode the local image without inserting a local filesystem path into content.
3. Call `upload_image` and keep the returned URL.
4. Add the image block or set the intended property.
5. Read the page or database again and verify the stored URL and alternative text.
6. If the content is public, fetch it through the scoped Content API and verify the public renderer.

Never place secrets, private screenshots, or credentials in a public page. Upload access follows the MCP environment's workspace scope; revoking that MCP URL stops future writes but does not delete assets already used by content.
