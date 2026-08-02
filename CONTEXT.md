# Nexfiy domain context

## Workspace

A workspace is the authorization scope for content. It is either a personal
Better Auth subject or an organization namespace in the form
`organization:<organizationId>`. Backend functions derive this scope from the
authenticated session or a validated MCP environment; clients never choose it.

## Page

A page is the universal content identity represented by a row in `documents`.
It owns the stable URL, title, icon, cover, hierarchy, publication state, and
BlockNote body. Existing documents without a `kind` are regular pages.

## Page block

A page block is a persisted, movable content or layout instance. Blocks form an
ordered tree through `pageId`, `parentBlockId`, and `order`. A trusted frontend
registry maps block types to renderers; user customization changes block
instances and configuration, never executable UI code. Legacy BlockNote JSON
coexists until a page explicitly adopts the normalized `page_blocks` model.

## Database

A database is a page whose `kind` is `database`. Its structured collection is
stored in a linked data source. The database page supplies the stable URL,
navigation placement, title, icon, cover, and publication shell.

## Data source

A data source owns a property schema, database rows, select options, relations,
and saved views. Multiple renderers must consume the same data source instead
of copying rows for each presentation.

## Database row

A database row is also a real page. Its `dataSourceId` records membership in a
data source. Row pages retain full BlockNote bodies and stable document URLs,
but are not listed as ordinary children in the workspace sidebar.

## Property schema

A property schema defines a stable property ID, display name, type, and order
for one data source. Supported storage types include title, text, number,
select, multi-select, status, date, checkbox, URL, and relation.

## Property value

A property value belongs to one row page and one property schema. Values are
stored in normalized typed fields so renderers, filters, sorts, MCP tools, and
future formulas do not parse presentation-specific JSON.

## Saved view

A saved view is a named lens over one data source. It records a renderer type
(table, board, calendar, or timeline), visible properties, sorting, filtering,
and the renderer's grouping or date configuration. Views never own copies of
database rows.

## Relation

A relation links a database row page to another page through a relation
property. Relation integrity and workspace access are enforced in the backend.

## Invariants

- Database rows are pages; page content and structured properties coexist.
- Table, board, calendar, and timeline render the same rows and values.
- Workspace scope is always derived server-side.
- UI and MCP are adapters over shared database-domain commands.
- Convex queries are the realtime source of truth; no polling or duplicate
  business-data store is introduced.
- Existing regular pages remain readable without a data migration.
- Moving a page or block across parents is atomic, workspace-scoped, and cannot
  create a containment cycle.
