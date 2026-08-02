# ADR-0001: Model database rows as pages

- Status: accepted
- Date: 2026-08-01

## Context

Nexfiy already models hierarchical pages with stable URLs and BlockNote bodies.
Table, board, calendar, and timeline capabilities need structured properties,
filters, sorts, and saved presentation settings without creating separate
copies of the same work item.

## Decision

A database is a page linked to a data source. Every row in that data source is
also a page. Property schemas, typed property values, select options, saved
views, and relations are stored separately from the page body.

All database renderers operate on the same rows. A pipeline move updates the
grouping property; a calendar move updates the date property. Neither renderer
owns a separate record collection.

Authenticated UI functions and MCP environment functions resolve their access
scope independently, then call shared database-domain commands.

## Consequences

- Every row can open as a full page and hold rich content.
- New renderers reuse the saved-view query model.
- Existing pages remain valid because the new page fields are optional.
- The sidebar must exclude pages carrying a `dataSourceId`.
- Publication must eventually project database schemas and values explicitly;
  publishing a database shell must not leak private properties.
- Arbitrary filters require a deliberate Convex query-planning strategy rather
  than an index for every possible property combination.
