# Nexfiy Content API

The Content API exposes only the databases explicitly selected for an
integration. It is a read-only, source-scoped boundary for websites, apps,
automations, and other content consumers.

## Routes

- `GET /api/contents` lists the databases available to the current key.
- `GET /api/contents/:databaseId?limit=25&cursor=...` returns that database's
  property schema and paginated content items.
- `GET /api/contents/:databaseId/:contentId` returns one item's document content
  and normalized blocks.
- `/api/b` and `/api/b/:databaseId` are compact aliases with identical output.

Every request requires `Authorization: Bearer <key>`. The routes support CORS
for browser-based content consumers.

## Boundaries

- An integration stores an explicit allowlist of Convex `dataSources` IDs.
- Owners and admins can change that allowlist without rotating the key.
- A key cannot select a database outside its active workspace.
- Archived or deleted databases disappear from discovery and API output.
- Raw keys are shown once and only their SHA-256 hashes are stored.
- Database items are cursor-paginated and capped at 100 per request.
- Item blocks preserve their type, editor ID, hierarchy, order, text, URL,
  color, checked state, rich props, linked database view, linked content ID, and
  synced-block group. Responses are capped at 1,000 blocks and report
  truncation.
- The API is read-only and does not expose general workspace pages.

## Module boundaries

- `convex/contentApi.ts` owns workspace authorization, key lifecycle, selected
  database validation, and external data reads.
- `features/content-api/useContentApi.ts` owns interactive settings operations.
- `features/content-api/DatabaseAccessPicker.tsx` renders the reusable database
  selector while Convex remains the source of truth for available databases.
- `features/content-api/contentApiRoute.ts` is the shared REST adapter used by
  both public route names.

## Parity checks

1. A key sees only its selected databases at both aliases.
2. A non-selected database ID returns `404`.
3. Updating an integration's selection changes output without key rotation.
4. Revoking a key changes both aliases to `401` immediately.
5. Settings database discovery updates reactively when workspace databases
   change.
6. Item-detail responses preserve every normalized block type used by the
   editor without changing its render props.
