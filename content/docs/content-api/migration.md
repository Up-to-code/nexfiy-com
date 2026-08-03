---
title: Canonical content migration
description: Migrate legacy link and image blocks to the canonical Content API and MCP contract.
---

The canonical contract is a breaking replacement for the earlier preview contract.

- Page `cover` replaces database properties named `Cover image`.
- Item `properties` replaces `values` and is present on list and detail responses.
- Links use `type: "link"`, `label`, and `href`.
- Images use `type: "image"`, `src`, `alt`, and `caption`.
- `propsJson`, legacy document `content`, and `contentModel` are no longer exposed.

Run `pageContentMigrations:migrateLegacyBlocks` in authenticated workspace batches. The result reports every unsupported or malformed block by ID. Resolve all failures before treating the migration as complete; Nexfiy never silently discards unsupported content.
