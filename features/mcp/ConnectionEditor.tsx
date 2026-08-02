"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { McpServerInput } from "@/hooks/useMcpServers";
import type { McpServerView } from "./mcp-types";

const EMPTY_FORM: McpServerInput = {
  name: "",
  url: "",
  transport: "streamable-http",
  authType: "none",
  headerName: "",
  secret: "",
};

export function ConnectionEditor({
  server,
  onCancel,
  onSave,
}: {
  server?: McpServerView;
  onCancel: () => void;
  onSave: (input: McpServerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<McpServerInput>(
    server
      ? {
          name: server.name,
          url: server.url,
          transport: server.transport,
          authType: server.authType,
          headerName: server.headerName ?? "",
          secret: "",
        }
      : EMPTY_FORM,
  );
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mcp-name">Connection name</Label>
          <Input
            id="mcp-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Email and calendar"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mcp-transport">Transport</Label>
          <Select
            value={form.transport}
            onValueChange={(value) =>
              setForm({
                ...form,
                transport: value as McpServerInput["transport"],
              })
            }
          >
            <SelectTrigger id="mcp-transport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
              <SelectItem value="sse">SSE (legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mcp-url">Server URL</Label>
        <Input
          id="mcp-url"
          type="url"
          value={form.url}
          onChange={(event) => setForm({ ...form, url: event.target.value })}
          placeholder="https://service.example/mcp"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mcp-auth">Authentication</Label>
          <Select
            value={form.authType}
            onValueChange={(value) =>
              setForm({
                ...form,
                authType: value as McpServerInput["authType"],
              })
            }
          >
            <SelectTrigger id="mcp-auth">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer token</SelectItem>
              <SelectItem value="custom-header">Custom header</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.authType === "custom-header" ? (
          <div className="space-y-2">
            <Label htmlFor="mcp-header">Header name</Label>
            <Input
              id="mcp-header"
              value={form.headerName}
              onChange={(event) =>
                setForm({ ...form, headerName: event.target.value })
              }
              placeholder="X-API-Key"
              required
            />
          </div>
        ) : null}
      </div>

      {form.authType !== "none" ? (
        <div className="space-y-2">
          <Label htmlFor="mcp-secret">
            {form.authType === "bearer" ? "Bearer token" : "Header value"}
          </Label>
          <Input
            id="mcp-secret"
            type="password"
            value={form.secret}
            onChange={(event) =>
              setForm({ ...form, secret: event.target.value })
            }
            placeholder={
              server ? "Leave blank to keep the saved secret" : "Required"
            }
            required={!server}
          />
          <p className="text-muted-foreground text-xs">
            Credentials stay on the server and are never returned to the
            browser.
          </p>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSaving}>
          {isSaving ? "Connecting…" : "Save and discover tools"}
        </Button>
      </div>
    </form>
  );
}
