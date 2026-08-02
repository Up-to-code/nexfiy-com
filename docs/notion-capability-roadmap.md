# Nexfiy dynamic workspace model

## What is implemented

### Page tree

`documents.parentDocument` is the page hierarchy. A parent page can have any
number of child pages, and moving a page changes only its parent/order metadata.
Database rows are also pages, but they carry `dataSourceId` and do not appear as
ordinary sidebar children.

Dynamic pages can also create a first-class `child_page` block from the shared
slash/search palette or the sidebar “Add sub-page” action. One transaction
creates the nested document, its initial editable paragraph, and the navigable
block in the parent canvas. Moving that block across page canvases reparents the
real document hierarchy; deleting it archives the linked nested page tree.

### Page composition

New dynamic pages use `documents.contentModel = "page_blocks"`. Their content
is a normalized tree in `pageBlocks`:

```text
page
├── heading
├── callout
│   └── paragraph
├── columns
│   ├── column
│   │   └── checklist
│   └── column
│       └── quote
└── database_view → data source + saved view
```

Every block has a stable ID, page, optional parent block, sibling order, type,
and typed configuration. Moving a block updates those references in one Convex
mutation; moving a container moves its complete descendant subtree. React
components are selected from a trusted registry—the user configures instances
and never uploads executable UI code.

Block insertion has one searchable `cmdk` palette backed by that same registry.
It serves root and nested “Add block” actions, while `/` in an empty paragraph
opens the palette and atomically converts that block in place. Column setup and
embedded database-view validation stay transactional and workspace-scoped.

Editable blocks use `react-textarea-autosize` and page-tree-aware keyboard
navigation. Enter atomically splits text at the caret and focuses the new block:
text-like blocks continue as paragraphs, list items preserve their list type,
and a continued checklist starts unchecked. Empty non-paragraph leaves normalize
to paragraphs in place. Shift+Enter remains a soft line break. Backspace on an
empty leaf removes it and restores focus to the previous editable block in
depth-first page order; containers with children are protected from deletion.

Legacy BlockNote pages remain readable until an explicit migration converts
their JSON body into normalized blocks.

### Databases and views

A database is a page plus a `dataSources` record. Each row is another page in
that data source. Properties, select options, typed values, and saved views are
normalized and shared by all renderers.

```text
database page
└── data source
    ├── property schemas
    ├── select/status options
    ├── row pages
    │   └── typed property values
    └── saved views
        ├── table
        ├── pipeline
        ├── calendar
        └── timeline
```

A Pipeline drag writes the grouping property. A Calendar drag writes the date
property. Table and Timeline receive the same update through Convex realtime
subscriptions; no view owns a duplicate row collection.

Relations are durable edges between row pages in two data sources. Relation
cells use the same realtime snapshot as every other view. Rollups reference a
relation, a target property, and a validated aggregate (`count`,
`count_values`, `sum`, `average`, `min`, or `max`). They are computed on the
server and are never stored as client-authored property values.

A relation may optionally create a named reciprocal property in its target
database. The two properties reference each other by stable IDs. Editing either
side transactionally mirrors edge additions and removals, so target tables,
rollups, formulas, and MCP reads receive the same realtime relationship without
a reverse-lookup store or client synchronization effect.

Formula properties store the authored expression plus a canonical versioned
AST and stable property dependencies. `jsep` parses expressions, while Nexfiy
allowlists syntax and functions and evaluates the AST itself. Formulas can
depend on stored properties, relations, rollups, or other formulas; recursive
evaluation detects cycles and never executes user-authored JavaScript.
Property settings and MCP can rename properties or recompile a formula in
place. The stable property IDs in the canonical AST preserve dependencies,
while readable `prop("Current name")` expressions are regenerated after a
rename so downstream formulas remain understandable and correct.

Page-tree moves, cross-page block moves, and typed database drag updates use
Convex optimistic query layers. The subscribed UI changes immediately, the
server remains authoritative, successful writes converge without a visual
second step, and a rejected write automatically restores every affected query
to the server result. No second business-data store or polling layer is used.

Page templates snapshot a complete nested dynamic-page tree and its normalized
blocks. Instantiation runs in one mutation, creates fresh document and block
IDs, preserves hierarchy and presentation settings, and validates linked
database views before committing the copy.

Synced content keeps an ordinary block subtree as the canonical source and
stores lightweight references in other dynamic pages. Every reference resolves
the source through Convex realtime queries, so editing content from any rendered
reference updates the canonical blocks and every other reference. Structural
editing stays on the source, references cannot be nested inside a canonical
synced subtree, and unlinking atomically replaces one reference with a fresh
independent copy.

### MCP authoring

Token-scoped MCP clients can now:

- create and inspect nested page hierarchies;
- atomically create idempotent child-page blocks that own real nested pages;
- create, inspect, update, and move normalized page blocks;
- idempotently split normalized block text at a caret position;
- move complete block subtrees between dynamic pages;
- create databases and typed properties/options;
- create and configure saved table, pipeline, calendar, and timeline views;
- add row pages and write typed values;
- create relation properties, replace relation edges, and create rollups;
- create paired reciprocal relations and edit either side transactionally;
- create safe formula properties with stable dependency references, rename
  properties, and safely recompile formulas in place;
- list, save, and instantiate nested page templates;
- create, inspect, and unlink canonical synced-block references; and
- embed any saved database view as a page block.

The reusable smoke scripts in `scripts/mcp-*-smoke.mjs` exercise the complete
flows through the MCP protocol rather than direct database access. They verify
idempotent block splitting, child-page creation and reparenting, template-safe
child-page ID remapping, list continuation, type normalization, synced-content
propagation, cycle rejection, and unlink isolation.

## Open-source interaction stack

| Capability          | Primitive      | Responsibility retained by Nexfiy     |
| ------------------- | -------------- | ------------------------------------- |
| Rich text migration | BlockNote      | Page model and persistence            |
| Drag and drop       | dnd-kit        | Authorization and durable moves       |
| Data grid           | TanStack Table | Property semantics and saved views    |
| Commands            | cmdk           | Command registry and mutations        |
| Controls            | Radix/shadcn   | Product styling and domain behavior   |
| Formula parsing     | jsep           | Validation and safe AST evaluation    |
| Realtime            | Convex         | Workspace scoping and source of truth |

The existing native block-to-sidebar bridge is the one temporary exception. It
preserves cross-page dragging across two currently separate drag contexts. The
backend already exposes one durable move command, so the UI can migrate to a
single application-level dnd-kit context without a data migration.

## Next domain capabilities

These need durable domain models before adding UI components:

1. **Formula editing depth** — add richer date functions and formula-aware view
   sorting on top of rename-safe property settings and in-place compilation.
2. **Template depth** — add template editing, categories, and database-schema
   cloning on top of the atomic page-tree copier.
3. **Collaboration depth** — comments, mentions, per-page permissions, version
   history, restore points, presence, and conflict-aware editing.

The order matters: relations precede rollups, the formula AST precedes formula
UI, and canonical synced-block ownership precedes a synced-block renderer.
