# Nexfiy Webhooks

Webhooks give external services a single dynamic endpoint for reading,
creating, updating, deleting, and building pages and blocks in a workspace.
Each webhook key carries a coarse permission set, and the backend enforces
workspace scope and billing on every call.

## Endpoint

Send a `POST` to:

```
/api/webhooks/:token
```

The token may instead be sent as an `Authorization: Bearer <token>` header.
The route supports CORS for browser-based automations.

## Authentication

- Keys are created under **Workspace settings → Webhooks**.
- The raw token is shown exactly once; only its SHA-256 hash is stored.
- A disabled or revoked key returns `401` immediately.
- Webhook access requires Nexfiy Pro; expired or downgraded workspaces return
  `402`.

## Permissions

A key's permission set is editable without rotating the token. Actions are
rejected with `403` when the key lacks the required permission.

| Permission  | Actions                                       |
| ----------- | --------------------------------------------- |
| `read`      | `list_pages`, `get_page`                      |
| `create`    | `create_page`                                 |
| `update`    | `update_page`, `update_block`, `move_block`   |
| `delete`    | `delete_page`                                 |
| `add_blocks`| `create_blocks`                               |

## Actions

Send `{ "action": "...", ...payload }` in the JSON body.

### `list_pages` — read

Returns up to 200 recent, non-archived pages as canonical summaries.

```
POST /api/webhooks/<token>
{ "action": "list_pages" }
```

### `get_page` — read

Returns one page with its normalized blocks.

```
{ "action": "get_page", "documentId": "<documentId>" }
```

### `create_page` — create

Creates a page. Defaults to the `page_blocks` content model. Supports
`parentId`, `content`, `icon`, `cover`, `isPublished`, and `contentModel`
(`page_blocks` or `blocknote`).

```
{ "action": "create_page", "title": "Release notes" }
```

### `update_page` — update

Updates `title`, `content`, `icon`, `cover`, or `isPublished`.

```
{ "action": "update_page", "documentId": "<id>", "title": "New title" }
```

### `delete_page` — delete

Archives one page to the workspace trash.

```
{ "action": "delete_page", "documentId": "<id>" }
```

### `create_blocks` — add_blocks

Atomically appends up to 250 normalized blocks. Blocks use local `key` and
`parentKey` references; each `parentKey` must name a container block that
appears earlier in the array. `child_page` and `synced_reference` block types
are not accepted here.

```
{
  "action": "create_blocks",
  "pageId": "<id>",
  "blocks": [
    { "key": "h1", "type": "heading_1", "text": "Overview" },
    { "key": "b1", "type": "bulleted_list", "text": "First point" }
  ]
}
```

### `update_block` — update

Updates `text`, `checked`, `url`, `alt`, `caption`, or `color` on one block.

```
{ "action": "update_block", "blockId": "<id>", "text": "Rewritten" }
```

### `move_block` — update

Moves a block `before`, `after`, or `inside` a target block, including across
pages. Child blocks move with their parent.

```
{
  "action": "move_block",
  "blockId": "<id>",
  "targetPageId": "<id>",
  "targetBlockId": "<id>",
  "placement": "inside"
}
```

## Responses

Successful calls return `{ "data": <result> }`. Errors return a JSON body with
an `error` message and, where applicable, a `code`:

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| `200`  | Success                                          |
| `400`  | Unknown action, invalid body, or invalid request |
| `401`  | Missing, disabled, or revoked token              |
| `402`  | Nexfiy Pro is required                           |
| `403`  | Key lacks the required permission                |
| `404`  | Page or block not found                          |

## Boundaries

- Webhook keys operate at the workspace level and never cross workspace scope.
- Read and write logic is shared with the MCP tools through
  `convex/lib/pageWriteDomain.ts`, so behavior stays consistent across
  adapters.
- Page moves are atomic, workspace-scoped, and cannot create containment
  cycles.
- Archived pages and database pages are excluded from page reads and writes.
- Raw tokens are shown once and only their SHA-256 hashes are stored.

## Module boundaries

- `convex/webhooks.ts` owns workspace authorization, key lifecycle, permission
  enforcement, and the external actions.
- `convex/lib/pageWriteDomain.ts` owns the shared page and block write
  commands used by both MCP and webhook adapters.
- `app/api/webhooks/[[...path]]/route.ts` is the REST adapter that hashes the
  token and maps actions to Convex functions.
- `features/webhooks/useWebhooks.ts` owns interactive settings operations.
- `features/webhooks/WebhooksSettings.tsx` renders the settings UI.

## Parity checks

1. A key without a permission cannot run any action that requires it.
2. Updating a key's permissions changes behavior without rotating the token.
3. Disabling or revoking a key turns every action into `401` immediately.
4. A token never grants access outside its workspace.
5. `create_page` followed by `create_blocks` and `get_page` round-trips blocks
   without data loss.
6. MCP tools and webhooks apply identical block, parent, and page-move rules.
