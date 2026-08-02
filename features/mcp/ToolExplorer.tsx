"use client";

import { useMemo, useState } from "react";
import { Play, Search, ShieldAlert, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { McpToolView } from "./mcp-types";

function starterArguments(inputSchemaJson: string) {
  try {
    const schema = JSON.parse(inputSchemaJson) as {
      properties?: Record<string, { type?: string }>;
      required?: string[];
    };
    const values = Object.fromEntries(
      (schema.required ?? []).map((name) => {
        const type = schema.properties?.[name]?.type;
        const value =
          type === "number" || type === "integer"
            ? 0
            : type === "boolean"
              ? false
              : type === "array"
                ? []
                : type === "object"
                  ? {}
                  : "";
        return [name, value];
      }),
    );
    return JSON.stringify(values, null, 2);
  } catch {
    return "{}";
  }
}

export function ToolExplorer({
  tools,
  isLoading,
  onToggle,
  onRun,
}: {
  tools: McpToolView[] | undefined;
  isLoading: boolean;
  onToggle: (tool: McpToolView, enabled: boolean) => Promise<void>;
  onRun: (
    tool: McpToolView,
    argumentsJson: string,
    confirmed: boolean,
  ) => Promise<{ success: boolean; resultText: string } | null>;
}) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [argumentsJson, setArgumentsJson] = useState("{}");
  const [confirmed, setConfirmed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tools ?? [];
    return (tools ?? []).filter(
      (tool) =>
        tool.name.toLowerCase().includes(normalized) ||
        tool.description?.toLowerCase().includes(normalized),
    );
  }, [query, tools]);
  const selectedTool =
    tools?.find((tool) => tool.name === selectedName) ?? filteredTools[0];

  const selectTool = (tool: McpToolView) => {
    setSelectedName(tool.name);
    setArgumentsJson(starterArguments(tool.inputSchemaJson));
    setConfirmed(false);
    setResult(null);
  };

  const run = async () => {
    if (!selectedTool) return;
    setIsRunning(true);
    setResult(null);
    const response = await onRun(selectedTool, argumentsJson, confirmed);
    setIsRunning(false);
    if (response)
      setResult({ success: response.success, text: response.resultText });
  };

  if (isLoading) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Loading tools…
      </p>
    );
  }

  if (!tools?.length) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
        <Wrench className="text-muted-foreground mb-3 size-8" />
        <p className="font-medium">No discovered tools</p>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Sync this connection to discover tools for email, pages, search,
          updates, and other actions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[430px] gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools"
            className="pl-9"
          />
        </div>
        <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
          {filteredTools.map((tool) => (
            <div
              key={tool._id}
              className={cn(
                "rounded-md border p-3 transition",
                selectedTool?._id === tool._id &&
                  "border-foreground/30 bg-muted/50",
              )}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => selectTool(tool)}
                >
                  <span className="block truncate text-sm font-medium">
                    {tool.name}
                  </span>
                  <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs">
                    {tool.description ??
                      "No description supplied by this server."}
                  </span>
                </button>
                <Switch
                  checked={tool.isEnabled}
                  onCheckedChange={(enabled) => onToggle(tool, enabled)}
                  aria-label={`Allow ${tool.name}`}
                />
              </div>
              <span className="text-muted-foreground mt-2 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                {tool.requiresConfirmation ? "Write / unknown" : "Read only"}
              </span>
            </div>
          ))}
          {!filteredTools.length ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No tools match your search.
            </p>
          ) : null}
        </div>
      </div>

      {selectedTool ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium">{selectedTool.name}</h4>
              <span className="bg-muted rounded px-2 py-0.5 text-xs">
                {selectedTool.requiresConfirmation
                  ? "Confirmation required"
                  : "Read only"}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {selectedTool.description ??
                "No description supplied by this server."}
            </p>
          </div>

          <details className="rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
              Input schema
            </summary>
            <pre className="bg-muted/40 max-h-40 overflow-auto border-t p-3 text-xs whitespace-pre-wrap">
              {selectedTool.inputSchemaJson}
            </pre>
          </details>

          <div className="space-y-2">
            <label htmlFor="mcp-tool-arguments" className="text-sm font-medium">
              Arguments
            </label>
            <textarea
              id="mcp-tool-arguments"
              value={argumentsJson}
              onChange={(event) => setArgumentsJson(event.target.value)}
              className="border-input bg-background min-h-32 w-full rounded-md border p-3 font-mono text-xs outline-none focus-visible:ring-2"
              spellCheck={false}
            />
          </div>

          {selectedTool.requiresConfirmation ? (
            <label className="bg-muted/40 flex items-start gap-3 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="size-4" /> Confirm this action
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  This tool may send email, update a page, create data, or
                  affect an external service.
                </span>
              </span>
            </label>
          ) : null}

          <Button
            type="button"
            onClick={run}
            disabled={
              !selectedTool.isEnabled ||
              isRunning ||
              (selectedTool.requiresConfirmation && !confirmed)
            }
          >
            <Play /> {isRunning ? "Running…" : "Run tool"}
          </Button>

          {result ? (
            <div
              className={cn(
                "rounded-md border p-3",
                result.success
                  ? "border-emerald-600/40"
                  : "border-destructive/40",
              )}
            >
              <p className="mb-2 text-xs font-medium">
                {result.success ? "Result" : "Error"}
              </p>
              <pre className="max-h-56 overflow-auto text-xs whitespace-pre-wrap">
                {result.text}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
