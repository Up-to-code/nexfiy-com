import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import type { McpExecutionView } from "./mcp-types";

function executionTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function ExecutionHistory({
  executions,
}: {
  executions: McpExecutionView[] | undefined;
}) {
  if (!executions) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Loading activity…
      </p>
    );
  }
  if (!executions.length) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="font-medium">No tool activity yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Every MCP tool run will appear here with its arguments and result.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((execution) => (
        <details key={execution._id} className="rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
            {execution.status === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : execution.status === "error" ? (
              <CircleAlert className="text-destructive size-4" />
            ) : (
              <LoaderCircle className="size-4 animate-spin" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {execution.toolName}
              </span>
              <span className="text-muted-foreground block text-xs">
                {execution.serverName} · {executionTime(execution.startedAt)}
              </span>
            </span>
            <span className="text-muted-foreground text-xs capitalize">
              {execution.status}
            </span>
          </summary>
          <div className="space-y-3 border-t p-3">
            <div>
              <p className="mb-1 text-xs font-medium">Arguments</p>
              <pre className="bg-muted/40 max-h-36 overflow-auto rounded p-2 text-xs whitespace-pre-wrap">
                {execution.argumentsJson}
              </pre>
            </div>
            {execution.resultText || execution.errorMessage ? (
              <div>
                <p className="mb-1 text-xs font-medium">
                  {execution.status === "error" ? "Error" : "Result"}
                </p>
                <pre className="bg-muted/40 max-h-48 overflow-auto rounded p-2 text-xs whitespace-pre-wrap">
                  {execution.resultText ?? execution.errorMessage}
                </pre>
              </div>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
