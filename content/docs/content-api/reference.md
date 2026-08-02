---
title: Content API reference
description: Authentication, endpoints, pagination, responses, errors, and aliases for the read-only API.
---

## Base URL and authentication

Send an API key as a Bearer token on every request.

```http
Authorization: Bearer nxf_your_secret_key
```

The examples use `https://your-nexfiy-host.com`. Replace it with the origin where your Nexfiy workspace is hosted.

## Endpoints

### List authorized databases

```http
GET /api/contents
```

Returns the databases selected for the current key. Use this endpoint to build a dynamic source picker instead of hard-coding IDs.

### List content

```http
GET /api/contents/:databaseId?limit=25&cursor=optional_cursor
```

| Parameter    | Type    | Description                                                   |
| ------------ | ------- | ------------------------------------------------------------- |
| `databaseId` | string  | An authorized database ID returned by the list endpoint.      |
| `limit`      | integer | Requested page size. The server applies its supported bounds. |
| `cursor`     | string  | Opaque cursor returned by the previous request.               |

A paginated response includes the source, schema, current item page, and a continuation cursor when more content exists.

```json
{
  "data": {
    "source": {
      "id": "database_id",
      "documentId": "database_document_id",
      "name": "Knowledge base",
      "icon": "📚",
      "updatedAt": 1785661200000
    },
    "schema": [],
    "items": []
  },
  "meta": {
    "isDone": true,
    "nextCursor": null
  }
}
```

Treat cursors as opaque strings. Do not parse or modify them.

### Get one content item

```http
GET /api/contents/:databaseId/:contentId
```

Returns one database item, including its property values and normalized blocks. The database must be in the key's selected scope.

## Alias routes

`/api/b` is an exact short alias for `/api/contents`.

| Canonical                              | Alias                           |
| -------------------------------------- | ------------------------------- |
| `/api/contents`                        | `/api/b`                        |
| `/api/contents/:databaseId`            | `/api/b/:databaseId`            |
| `/api/contents/:databaseId/:contentId` | `/api/b/:databaseId/:contentId` |

## Responses

Successful responses use JSON. Property and block payloads are designed to retain enough structure for a consumer to render the source faithfully; unknown future block types should be ignored gracefully.

## Errors

Errors use an HTTP status and a JSON message. Handle at least these cases:

| Status | Meaning                                                 | Recommended action                    |
| ------ | ------------------------------------------------------- | ------------------------------------- |
| `400`  | Invalid parameter or malformed request                  | Correct the request before retrying.  |
| `401`  | Missing, invalid, expired, or revoked key               | Replace or rotate the credential.     |
| `404`  | Source or content is missing or outside the key's scope | Refresh the authorized database list. |
| `503`  | Service is temporarily unavailable                      | Retry with exponential backoff.       |

Do not retry authentication and validation failures in a tight loop.

## CORS and browser use

Even if your deployment permits a browser request, a Content API key must remain secret. Call Nexfiy from a trusted server route, server component, worker, or backend—not directly from client-side JavaScript.

## Compatibility

Consumers should:

- Ignore additional object fields they do not recognize.
- Render an unsupported block with a safe fallback.
- Preserve block order and recursively render children.
- Follow `meta.nextCursor` rather than constructing pagination offsets.
