import type { Doc } from "@/convex/_generated/dataModel";

export type McpServerView = Omit<Doc<"mcpServers">, "ownerId" | "secret"> & {
  hasSecret: boolean;
};

export type McpToolView = Omit<Doc<"mcpTools">, "ownerId"> & {
  requiresConfirmation: boolean;
};

export type McpExecutionView = Omit<Doc<"mcpExecutions">, "ownerId">;
