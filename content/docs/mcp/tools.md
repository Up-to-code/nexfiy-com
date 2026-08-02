---
title: MCP tool catalog
description: The complete Nexfiy MCP catalog for documents, blocks, templates, synced content, and databases.
---

The tools available to a client are grouped below. Names are stable identifiers the MCP client can call; the client may present them as natural-language capabilities.

## Read documents

| Tool               | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `list_documents`   | List accessible workspace documents.                     |
| `search_documents` | Search documents by query.                               |
| `get_document`     | Get a document and its metadata.                         |
| `list_page_blocks` | Read the ordered blocks for a page.                      |
| `get_synced_block` | Resolve synchronized block content.                      |
| `get_database`     | Read a database definition, views, properties, and rows. |

These tools are advertised to clients as read-only.

## Create and organize pages

| Tool                | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `create_document`   | Create a document.                                                |
| `create_child_page` | Create a page below another page.                                 |
| `create_workspace`  | Create a page hierarchy from an outline, up to 50 pages per call. |
| `update_document`   | Update document metadata or page content.                         |
| `archive_document`  | Archive a document. This is a destructive operation.              |

## Page blocks

| Tool                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `create_page_blocks` | Add up to 250 normalized blocks in one call.       |
| `update_page_block`  | Change an existing page block.                     |
| `split_page_block`   | Split a block at a requested position.             |
| `move_page_block`    | Reorder or reparent a block.                       |
| `upload_image`       | Upload an asset and optionally add an image block. |

Supported block families include paragraphs, headings, lists, checklists, quotes, callouts, toggles, dividers, media, bookmarks, child pages, columns, database views, synchronized references, and BlockNote custom blocks.

See [Upload images with MCP](/docs/mcp/images) for the complete binary upload and image-block workflow.

## Templates

| Tool                        | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| `list_page_templates`       | List saved page templates.                    |
| `save_page_as_template`     | Save an existing page as a reusable template. |
| `instantiate_page_template` | Create a page from a saved template.          |

## Synchronized blocks

| Tool                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `create_synced_reference` | Add a reference to synchronized content. |
| `unlink_synced_reference` | Detach a reference from its source.      |

## Databases

| Tool                       | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `create_database`          | Create a database.                                         |
| `add_database_property`    | Add a typed property.                                      |
| `update_database_property` | Change a property definition.                              |
| `create_database_view`     | Add a database view.                                       |
| `configure_database_view`  | Change a view's layout, filters, sorts, or visible fields. |
| `add_database_row`         | Add a row to a database.                                   |
| `set_database_value`       | Set a typed property value on a row.                       |
| `set_database_relation`    | Connect rows through a relation property.                  |

## Working safely

MCP clients receive hints about read-only and destructive tools, but the client and user remain responsible for reviewing calls.

- Start with list, search, and get tools to confirm IDs.
- Read the current document or database before changing it.
- Prefer small, reviewable write calls.
- Treat `archive_document` as destructive.
- Do not retry a failed write indefinitely; inspect the returned error first.
- For large imports, split work across calls and verify each batch.

## Limits and validation

Tool inputs are validated by the server. Current bulk limits include 50 pages for `create_workspace` and 250 blocks for `create_page_blocks`. A client should handle validation, authorization, not-found, and temporary service errors without assuming a write succeeded.
