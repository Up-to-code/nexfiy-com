# Nexfiy MCP client

Nexfiy can connect to any remote Model Context Protocol server that supports Streamable HTTP or legacy SSE.

## Connection flow

1. Open **Workspace settings → MCP → Add connection**.
2. Enter the remote MCP endpoint and the authentication details supplied by the service.
3. Nexfiy connects to the server and discovers up to 200 tools.
4. Review the discovered tools and disable anything Nexfiy should not use.
5. Select a tool, review its input schema, provide JSON arguments, and run it.
6. Inspect the result and execution record under **Activity**.

Credentials are stored only in the Convex backend and are never returned by a client query. All connection, tool, and execution reads are scoped to the authenticated user.

## What it can do

Capabilities depend entirely on the connected server. For example, a service may expose tools that:

- search, read, draft, send, label, or update email;
- search, create, read, or update pages and documents;
- search files and retrieve file contents;
- read calendars or create events;
- query developer tools, issues, repositories, or deployments.

Nexfiy does not invent these capabilities. They appear only when the remote MCP server advertises the corresponding tools.

## Safety model

- Private-network and localhost MCP URLs are rejected.
- Disabled connections and disabled tools cannot be invoked.
- Tools explicitly marked read-only may run directly.
- Write tools and tools without a trustworthy read-only hint require confirmation before each run.
- Tool arguments and results are size-limited.
- Every invocation is recorded with its connection, tool, arguments, status, and result.
- Tokens and custom authentication headers are never included in tool metadata or execution history.

MCP annotations are treated as hints, not a security guarantee. Unknown tools therefore use the safer confirmation-required behavior.
