# ADR-0002: Persist composable page blocks as movable instances

- Status: accepted
- Date: 2026-08-01

## Context

The existing BlockNote document is stored as one JSON value. That is convenient
for rich text editing, but it cannot safely support atomic cross-page block
movement, independent realtime subscriptions, embedded saved database views, or
nested user-defined layouts without rewriting an entire page document.

## Decision

Introduce `pageBlocks` as the durable composition model. Each block has a page,
optional parent block, type, sibling order, typed common fields, and optional
references to a data source and saved database view. A frontend block registry
maps the persisted type to a trusted renderer and insertion metadata; users
configure block instances but never provide executable React code.

The existing BlockNote JSON remains readable during migration. Pages opt into
the normalized model through `documents.contentModel = "page_blocks"` only
after their content has been converted or created in the new editor.

Cross-page movement is one backend mutation. It validates source and target
workspace access, prevents containment cycles, moves the complete descendant
subtree, and normalizes sibling order at both locations.

## Consequences

- Text, media, layout containers, and database views share one composition tree.
- A database view block references shared data; it never copies rows.
- Blocks can move between pages while preserving identity and descendants.
- Legacy pages can coexist until an explicit migration is verified.
- The UI must render from Convex subscriptions and must not maintain a second
  authoritative block store.
