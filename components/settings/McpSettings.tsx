"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMcpServers, type McpServerInput } from "@/hooks/useMcpServers";
import {
  CheckCircle2,
  CircleAlert,
  Pencil,
  PlugZap,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type Server = NonNullable<ReturnType<typeof useMcpServers>["servers"]>[number];

const EMPTY_FORM: McpServerInput = {
  name: "",
  url: "",
  transport: "streamable-http",
  authType: "none",
  headerName: "",
  secret: "",
};

export const McpSettings = ({ enabled }: { enabled: boolean }) => {
  const mcp = useMcpServers(enabled);
  const [editingId, setEditingId] = useState<Id<"mcpServers"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<McpServerInput>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<Id<"mcpServers"> | null>(null);

  const openEditor = (server?: Server) => {
    if (!server) {
      setEditingId("new");
      setForm(EMPTY_FORM);
      return;
    }
    setEditingId(server._id);
    setForm({
      name: server.name,
      url: server.url,
      transport: server.transport,
      authType: server.authType,
      headerName: server.headerName ?? "",
      secret: "",
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const succeeded =
      editingId === "new"
        ? await mcp.create(form)
        : editingId
          ? await mcp.update(editingId, form)
          : false;
    setIsSaving(false);
    if (succeeded) setEditingId(null);
  };

  const test = async (id: Id<"mcpServers">) => {
    setTestingId(id);
    await mcp.test(id);
    setTestingId(null);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">MCP connections</h3>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Add remote Model Context Protocol servers to your workspace. Every
            connection is private to your account.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => openEditor()}
          disabled={editingId !== null}
        >
          <Plus className="size-4" /> Add MCP
        </Button>
      </div>

      {editingId && (
        <form
          onSubmit={save}
          className="bg-muted/20 space-y-4 rounded-lg border p-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {editingId === "new" ? "New MCP server" : "Edit MCP server"}
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditingId(null)}
            >
              <X />
              <span className="sr-only">Close editor</span>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Name</Label>
              <Input
                id="mcp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="GitHub tools"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-transport">Transport</Label>
              <select
                id="mcp-transport"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={form.transport}
                onChange={(e) =>
                  setForm({
                    ...form,
                    transport: e.target.value as McpServerInput["transport"],
                  })
                }
              >
                <option value="streamable-http">Streamable HTTP</option>
                <option value="sse">SSE (legacy)</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-url">Server URL</Label>
            <Input
              id="mcp-url"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/mcp"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mcp-auth">Authentication</Label>
              <select
                id="mcp-auth"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={form.authType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    authType: e.target.value as McpServerInput["authType"],
                  })
                }
              >
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="custom-header">Custom header</option>
              </select>
            </div>
            {form.authType === "custom-header" && (
              <div className="space-y-2">
                <Label htmlFor="mcp-header">Header name</Label>
                <Input
                  id="mcp-header"
                  value={form.headerName}
                  onChange={(e) =>
                    setForm({ ...form, headerName: e.target.value })
                  }
                  placeholder="X-API-Key"
                  required
                />
              </div>
            )}
          </div>
          {form.authType !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="mcp-secret">
                {form.authType === "bearer" ? "Bearer token" : "Header value"}
              </Label>
              <Input
                id="mcp-secret"
                type="password"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder={
                  editingId === "new"
                    ? "Required"
                    : "Leave blank to keep the current secret"
                }
                required={editingId === "new"}
              />
              <p className="text-muted-foreground text-xs">
                Stored server-side and never returned to the browser.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </Button>
            <Button disabled={isSaving}>
              {isSaving ? "Saving…" : "Save connection"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {mcp.isLoading && (
          <p className="text-muted-foreground text-sm">Loading connections…</p>
        )}
        {!mcp.isLoading && mcp.servers?.length === 0 && (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
            <PlugZap className="text-muted-foreground mb-3 size-8" />
            <p className="font-medium">No MCP servers yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Add a remote server to make its tools available to your workspace.
            </p>
          </div>
        )}
        {mcp.servers?.map((server) => (
          <div
            key={server._id}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{server.name}</p>
                {server.lastTestStatus === "success" && (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
                {server.lastTestStatus === "error" && (
                  <CircleAlert className="text-destructive size-4" />
                )}
              </div>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {server.url}
              </p>
              {server.lastTestMessage && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {server.lastTestMessage}
                </p>
              )}
            </div>
            <Switch
              checked={server.isEnabled}
              onCheckedChange={(checked) => mcp.setEnabled(server._id, checked)}
              aria-label={`Enable ${server.name}`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => test(server._id)}
              disabled={testingId === server._id}
            >
              {testingId === server._id ? "Testing…" : "Test"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEditor(server)}
              disabled={editingId !== null}
            >
              <Pencil />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => mcp.remove(server._id)}
            >
              <Trash2 />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};
