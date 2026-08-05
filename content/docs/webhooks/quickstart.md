---
title: Webhooks quickstart
description: Create a webhook key, choose permissions, and make your first page and block calls with curl.
---

Webhooks give external services and automations a single dynamic endpoint for
reading, creating, updating, and deleting pages and blocks in a Nexfiy
workspace. A webhook key carries a coarse permission set, and the backend
enforces workspace scope and billing on every call.

## 1. Create a webhook key

Open **Workspace settings → Webhooks** and create a key.

1. Give the key a recognizable name.
2. Select the permissions the key may use (`read`, `create`, `update`,
   `delete`, `add_blocks`). You can change these later without rotating the
   token.
3. Create the key and copy it immediately.

The raw token is shown **exactly once** — only its SHA-256 hash is stored, so
Nexfiy cannot display it again. Store it in a secret manager or a server-side
environment variable.

Webhook access requires Nexfiy Pro. Only workspace owners and admins can manage
keys.

## 2. Make your first call

Export the token and send a `list_pages` action:

```bash
export NEXFIY_WEBHOOK_TOKEN="nxf_..."
export NEXFIY_URL="https://your-nexfiy-host.com"
```

```bash
curl "$NEXFIY_URL/api/webhooks/$NEXFIY_WEBHOOK_TOKEN" \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{ "action": "list_pages" }'
```

The token may instead be sent as an `Authorization: Bearer <token>` header,
which keeps it out of URLs and logs:

```bash
curl "$NEXFIY_URL/api/webhooks/__token__" \
  --request POST \
  --header "Authorization: Bearer $NEXFIY_WEBHOOK_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{ "action": "list_pages" }'
```

A successful call returns `{ "data": <result> }`:

```json
{
  "data": [
    {
      "id": "document_id",
      "title": "Release notes",
      "icon": "🚀",
      "lastEditedAt": 1785661200000
    }
  ]
}
```

## 3. Create a page and append blocks

Webhook calls are atomic and workspace-scoped. Combine `create_page` with
`create_blocks` to build a page in two round trips:

```bash
curl "$NEXFIY_URL/api/webhooks/$NEXFIY_WEBHOOK_TOKEN" \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "action": "create_page",
    "title": "Release notes"
  }'
```

Capture the returned page `id`, then append up to 250 normalized blocks using
local `key` and `parentKey` references:

```bash
curl "$NEXFIY_URL/api/webhooks/$NEXFIY_WEBHOOK_TOKEN" \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "action": "create_blocks",
    "pageId": "<page_id>",
    "blocks": [
      { "key": "h1", "type": "heading_1", "text": "Overview" },
      { "key": "b1", "type": "bulleted_list", "text": "First point" },
      { "key": "b2", "type": "bulleted_list", "text": "Second point" }
    ]
  }'
```

## Next steps

- Read the full action catalog in the [webhook actions reference](/docs/webhooks/reference).
- Learn about the normalized block model in [Blocks and properties](/docs/content-api/blocks).
- See how MCP tools and webhooks share the same write rules in the
  [MCP tools](/docs/mcp/tools) guide.
