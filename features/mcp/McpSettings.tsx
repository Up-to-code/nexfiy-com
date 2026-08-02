"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Activity,
  Cable,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Mail,
  Pencil,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useMcpServers, type McpServerInput } from "@/hooks/useMcpServers";
import { ConnectionEditor } from "./ConnectionEditor";
import { ExecutionHistory } from "./ExecutionHistory";
import type { McpServerView, McpToolView } from "./mcp-types";
import { ToolExplorer } from "./ToolExplorer";
import { ClientAccess } from "./ClientAccess";
import { ClientEnvironmentDialog } from "./ClientEnvironmentDialog";
import { useMcpEnvironments } from "./useMcpEnvironments";
import { useBilling } from "@/features/billing/use-billing";
import { ProUpgradePrompt } from "@/features/billing/ProUpgradePrompt";

type McpView = "connections" | "tools" | "clients" | "activity";

const VIEW_ITEMS: Array<{
  value: McpView;
  label: string;
  icon: typeof PlugZap;
}> = [
  { value: "connections", label: "Connections", icon: PlugZap },
  { value: "tools", label: "Tools", icon: Wrench },
  { value: "clients", label: "Client access", icon: Cable },
  { value: "activity", label: "Activity", icon: Activity },
];

export function McpSettings({ enabled }: { enabled: boolean }) {
  const [view, setView] = useState<McpView>("connections");
  const [selectedServerId, setSelectedServerId] = useState<Id<"mcpServers">>();
  const [editingId, setEditingId] = useState<Id<"mcpServers"> | "new" | null>(
    null,
  );
  const [syncingId, setSyncingId] = useState<Id<"mcpServers"> | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const mcp = useMcpServers(enabled, selectedServerId);
  const mcpEnvironments = useMcpEnvironments(enabled);
  const billing = useBilling();
  const selectedServer = mcp.servers?.find(
    (server) => server._id === selectedServerId,
  );
  const editingServer =
    editingId && editingId !== "new"
      ? mcp.servers?.find((server) => server._id === editingId)
      : undefined;

  const sync = async (id: Id<"mcpServers">) => {
    setSyncingId(id);
    const succeeded = await mcp.syncTools(id);
    setSyncingId(null);
    return succeeded;
  };

  const saveConnection = async (input: McpServerInput) => {
    let id: Id<"mcpServers"> | null = null;
    if (editingId === "new") {
      id = await mcp.create(input);
    } else if (editingId) {
      const updated = await mcp.update(editingId, input);
      if (updated) id = editingId;
    }
    if (!id) return;
    setEditingId(null);
    setSelectedServerId(id);
    const connected = await sync(id);
    if (connected) setView("tools");
  };

  const openTools = (id: Id<"mcpServers">) => {
    setSelectedServerId(id);
    setView("tools");
  };

  const removeConnection = async (server: McpServerView) => {
    if (!window.confirm(`Remove ${server.name} and its saved tool history?`)) {
      return;
    }
    const removed = await mcp.remove(server._id);
    if (removed && selectedServerId === server._id) {
      setSelectedServerId(undefined);
      setView("connections");
    }
  };

  const runTool = async (
    tool: McpToolView,
    argumentsJson: string,
    confirmed: boolean,
  ) => {
    if (!selectedServerId) return null;
    return await mcp.invokeTool({
      serverId: selectedServerId,
      toolName: tool.name,
      argumentsJson,
      confirmed,
    });
  };

  if (!billing.isLoading && !billing.subscription?.hasPro) {
    return <ProUpgradePrompt feature="MCP" />;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">MCP tools</h3>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Connect Nexfiy to remote tools, or connect Codex and Claude to your
            Nexfiy workspace.
          </p>
          <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1">
              <Search className="size-3" /> Search
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1">
              <Mail className="size-3" /> Email
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1">
              <Wrench className="size-3" /> Pages and updates
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={editingId !== null}>
              <Plus /> Add MCP <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-1.5">
            <DropdownMenuItem
              className="items-start gap-3 p-3"
              onSelect={() => setEditingId("new")}
            >
              <PlugZap className="mt-0.5 size-4" />
              <span>
                <span className="block font-medium">
                  Connect a remote server
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                  Let Nexfiy discover and run tools from another MCP server.
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="items-start gap-3 p-3"
              onSelect={() => setIsClientDialogOpen(true)}
            >
              <Cable className="mt-0.5 size-4" />
              <span>
                <span className="block font-medium">
                  Connect Codex or Claude
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                  Create a Nexfiy MCP URL for an external client.
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-1 border-b">
        {VIEW_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              if (
                item.value === "tools" &&
                !selectedServerId &&
                mcp.servers?.[0]
              ) {
                setSelectedServerId(mcp.servers[0]._id);
              }
              setView(item.value);
            }}
            className={cn(
              "text-muted-foreground flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm transition",
              view === item.value && "border-foreground text-foreground",
            )}
          >
            <item.icon className="size-4" /> {item.label}
          </button>
        ))}
      </div>

      {view === "connections" ? (
        <div className="space-y-3">
          {mcp.isLoading ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Loading connections…
            </p>
          ) : null}
          {!mcp.isLoading && !mcp.servers?.length ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
              <PlugZap className="text-muted-foreground mb-3 size-8" />
              <p className="font-medium">Connect your first MCP server</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Add a remote server, securely store its token, then review the
                tools it exposes before running anything.
              </p>
              <Button
                className="mt-4"
                size="sm"
                onClick={() => setEditingId("new")}
              >
                <Plus /> Add connection
              </Button>
            </div>
          ) : null}
          {mcp.servers?.map((server) => (
            <div
              key={server._id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
            >
              <span className="bg-muted flex size-10 items-center justify-center rounded-md">
                <PlugZap className="size-4" />
              </span>
              <div className="min-w-48 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{server.name}</p>
                  {server.lastTestStatus === "success" ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : null}
                  {server.lastTestStatus === "error" ? (
                    <CircleAlert className="text-destructive size-4" />
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {server.url}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {server.lastTestMessage ?? "Not connected yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openTools(server._id)}
                className="hover:bg-muted rounded-md border px-3 py-2 text-left text-xs transition"
              >
                <span className="block font-medium">
                  {server.toolCount ?? 0} tools
                </span>
                <span className="text-muted-foreground">Review access</span>
              </button>
              <Switch
                checked={server.isEnabled}
                onCheckedChange={(checked) =>
                  mcp.setEnabled(server._id, checked)
                }
                aria-label={`Enable ${server.name}`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => sync(server._id)}
                disabled={syncingId === server._id}
              >
                <RefreshCw
                  className={cn(syncingId === server._id && "animate-spin")}
                />
                {syncingId === server._id ? "Syncing…" : "Sync"}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditingId(server._id)}
                disabled={editingId !== null}
              >
                <Pencil />
                <span className="sr-only">Edit {server.name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => removeConnection(server)}
              >
                <Trash2 />
                <span className="sr-only">Remove {server.name}</span>
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {view === "tools" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select
              value={selectedServerId ?? ""}
              onValueChange={(value) =>
                setSelectedServerId(value as Id<"mcpServers">)
              }
            >
              <SelectTrigger className="min-w-56" aria-label="MCP connection">
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {mcp.servers?.map((server) => (
                  <SelectItem key={server._id} value={server._id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedServer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => sync(selectedServer._id)}
                disabled={syncingId === selectedServer._id}
              >
                <RefreshCw
                  className={cn(
                    syncingId === selectedServer._id && "animate-spin",
                  )}
                />{" "}
                Sync tools
              </Button>
            ) : null}
          </div>
          {selectedServerId ? (
            <ToolExplorer
              tools={mcp.tools}
              isLoading={mcp.isToolsLoading}
              onToggle={(tool, isEnabled) =>
                mcp.setToolEnabled(tool._id, isEnabled)
              }
              onRun={runTool}
            />
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
              Add or select a connection to inspect its tools.
            </p>
          )}
        </div>
      ) : null}

      {view === "activity" ? (
        <ExecutionHistory executions={mcp.executions} />
      ) : null}

      {view === "clients" ? (
        <ClientAccess
          enabled={enabled}
          onCreate={() => setIsClientDialogOpen(true)}
        />
      ) : null}

      <ClientEnvironmentDialog
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        onCreate={mcpEnvironments.create}
      />

      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingServer ? "Edit MCP connection" : "Connect an MCP server"}
            </DialogTitle>
            <DialogDescription>
              Use the remote server URL and credentials supplied by the service.
            </DialogDescription>
          </DialogHeader>
          {editingId ? (
            <ConnectionEditor
              key={editingId}
              server={editingServer}
              onCancel={() => setEditingId(null)}
              onSave={saveConnection}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
