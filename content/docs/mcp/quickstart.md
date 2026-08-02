---
title: Connect an MCP client
description: Connect Codex, Claude, or another Streamable HTTP MCP client to a Nexfiy workspace.
---

Nexfiy's MCP endpoint lets an authorized AI client search and work with pages, blocks, templates, and databases.

## 1. Create a client environment

Open **Workspace settings → MCP → Client access** and create an environment. Give it a name that identifies the client or machine.

Nexfiy shows a token-bearing endpoint similar to:

```text
https://your-nexfiy-host.com/api/mcp/your_environment_token
```

Copy it immediately. The complete URL is shown once and acts as a credential.

## 2. Add Nexfiy to your client

### Codex

```bash
codex mcp add nexfiy --url "https://your-nexfiy-host.com/api/mcp/your_environment_token"
```

### Claude Code

```bash
claude mcp add --transport http nexfiy "https://your-nexfiy-host.com/api/mcp/your_environment_token"
```

### Generic MCP configuration

For clients that accept an MCP server configuration:

```json
{
  "mcpServers": {
    "nexfiy": {
      "type": "http",
      "url": "https://your-nexfiy-host.com/api/mcp/your_environment_token"
    }
  }
}
```

The client must support MCP over Streamable HTTP.

## 3. Test the connection

Restart or reload the client if required, then try:

```text
List the documents in my Nexfiy workspace.
```

Next, test a read with a specific result:

```text
Open the first document and summarize its page blocks without changing anything.
```

Only after confirming the target should you test a write:

```text
Create a new page called “MCP connection test” with one paragraph, then show me its ID.
```

## Example workflows

- Search workspace pages and summarize matching content.
- Create a page from a saved template.
- Build a hierarchy of pages from an outline.
- Add, update, split, move, or synchronize page blocks.
- Create a database, add properties and views, and populate rows.

See [MCP tools](/docs/mcp/tools) for the complete catalog.

## Security and revocation

- Treat the endpoint URL like a password.
- Do not paste it into public issues, logs, screenshots, or repositories.
- Create a separate environment for each client or integration.
- Review a client's proposed destructive operation before approving it.
- Revoke the environment in Workspace settings if the URL is exposed or no longer needed.
