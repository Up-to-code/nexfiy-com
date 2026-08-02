---
title: Nexfiy developer documentation
description: Read workspace content with the Content API or connect an AI client through MCP.
---

Nexfiy exposes two public integrations. The **Content API** is a read-only HTTP API for selected databases. **MCP** connects compatible AI clients to pages, blocks, templates, and databases.

## Choose an integration

| Use case                                        | Content API | MCP                                 |
| ----------------------------------------------- | ----------- | ----------------------------------- |
| Render database content in a website or app     | Recommended | —                                   |
| Build a content pipeline or automation          | Recommended | Optional                            |
| Let an AI assistant search and edit a workspace | —           | Recommended                         |
| Use standard JSON over HTTP                     | Yes         | Through an MCP client               |
| Write workspace content                         | No          | Yes, with an authorized environment |

## Content API

Create a scoped API key, choose the databases it can read, then request either `/api/contents` or its short alias `/api/b`.

```bash
curl "https://your-nexfiy-host.com/api/contents" \
  --header "Authorization: Bearer $NEXFIY_CONTENT_API_KEY"
```

[Start with the Content API](/docs/content-api/quickstart) or open the [endpoint reference](/docs/content-api/reference).

## Model Context Protocol

Create a client environment in **Workspace settings → MCP → Client access**. Nexfiy gives you a token-bearing Streamable HTTP URL to add to Codex, Claude, or another MCP client.

[Connect an MCP client](/docs/mcp/quickstart) or review the [complete tool catalog](/docs/mcp/tools).

## Documentation for people and agents

Every documentation page has **Copy Markdown** and **Download .md** actions. Raw sources are also available from `/api/docs/markdown/{slug}`.

For AI tools and documentation crawlers, use:

- `/llms.txt` for the documentation index.
- `/llms-full.txt` for the complete documentation in one Markdown response.

## Security model

API keys and MCP environment URLs are credentials. Store them in a secret manager or server-side environment variable, restrict their scope, and revoke them immediately if exposed. Never include either credential in browser JavaScript or a public repository.
