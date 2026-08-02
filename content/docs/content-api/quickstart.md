---
title: Content API quickstart
description: Create a scoped key and read workspace database content with curl.
---

The Content API provides read-only access to the databases explicitly selected for an API key.

## 1. Create an API key

Open **Workspace settings → API** and create a key.

1. Give the key a recognizable name.
2. Select one or more databases from the workspace.
3. Create the key and copy it immediately.

The secret is shown once. Save it in a password manager, secret manager, or server-side environment variable.

```bash
export NEXFIY_CONTENT_API_KEY="nxf_..."
export NEXFIY_URL="https://your-nexfiy-host.com"
```

## 2. List available databases

```bash
curl "$NEXFIY_URL/api/contents" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

The response only includes sources authorized for this key.

```json
{
  "data": [
    {
      "id": "database_id",
      "documentId": "database_document_id",
      "name": "Knowledge base",
      "icon": "📚",
      "updatedAt": 1785661200000
    }
  ],
  "meta": { "count": 1 }
}
```

## 3. Read database content

Use the returned database ID as `databaseId`.

```bash
curl "$NEXFIY_URL/api/contents/database_id?limit=25" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

When `meta.nextCursor` is present, pass it as `cursor` to load the next page.

```bash
curl "$NEXFIY_URL/api/contents/database_id?limit=25&cursor=cursor_value" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

## 4. Read one item

```bash
curl "$NEXFIY_URL/api/contents/database_id/content_id" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

The item response contains its database property values and normalized page blocks. See [Blocks and properties](/docs/content-api/blocks) for rendering guidance.

## 5. Rotate or revoke access

Return to **Workspace settings → API** to revoke a key or change which databases it can access. A revoked key stops working immediately.

## Short alias

Every `/api/contents` route is also available under `/api/b`:

```text
/api/b
/api/b/:databaseId
/api/b/:databaseId/:contentId
```

Both route families use the same authentication, scope, payloads, and limits.
