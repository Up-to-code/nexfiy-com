# ADR-0003: Build product views on open-source headless primitives

- Status: accepted
- Date: 2026-08-01

## Context

Nexfiy needs Notion-like composition, tables, pipelines, calendars, timelines,
commands, and drag-and-drop without maintaining bespoke implementations of
well-understood interaction mechanics. At the same time, the UI must remain
Nexfiy's product rather than inherit a third-party visual system or a premium
calendar's data model.

## Decision

Use a small open-source, headless stack and keep Convex as the only durable
source of truth:

- BlockNote provides the legacy rich-text editor during normalized-block
  migration.
- dnd-kit provides page ordering and database card/date drag interactions.
- TanStack Table provides the dynamic data-grid row and column model.
- cmdk provides command search and keyboard navigation.
- Radix primitives through shadcn provide dialogs, menus, selects, tabs, and
  other accessible controls.
- jsep parses formula expressions into syntax trees; Nexfiy validates and
  evaluates a small allowlisted language rather than executing JavaScript.
- Convex subscriptions provide realtime state. Library-local state may track
  transient interaction state, but never duplicates pages, blocks, rows, or
  saved views as an authoritative client store.

Calendar and timeline renderers remain thin Nexfiy projections of the shared
database snapshot. Their drag behavior uses dnd-kit, while dates, filtering,
sorting, grouping, and saved-view configuration stay in the database domain.
This avoids a premium calendar dependency and prevents a calendar package from
becoming a second application model.

The existing native block-to-sidebar drag bridge remains temporarily because
it crosses the page canvas and sidebar's separate drag contexts. It will move
to one application-level dnd-kit context when those surfaces are consolidated;
the backend `pageBlocks.move` mutation already provides the durable operation.

## Consequences

- Complex interaction mechanics come from maintained open-source libraries.
- Nexfiy keeps complete control over styling, page semantics, and saved views.
- Table, pipeline, calendar, and timeline continue to render the same rows and
  properties rather than owning separate copies.
- New views should first compose the accepted primitives instead of adding a
  new UI framework or custom drag engine.
- The temporary native cross-surface bridge is explicit technical debt rather
  than an accidental second drag architecture.
