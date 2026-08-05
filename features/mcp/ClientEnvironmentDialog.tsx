"use client";

import { useState } from "react";
import {
  Check,
  CircleAlert,
  Clipboard,
  FlaskConical,
  Loader2,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { useI18n } from "@/lib/i18n/I18nProvider";

import type { CreatedMcpEnvironment } from "./useMcpEnvironments";

type ClientKind = "codex" | "claude" | "generic";

function clientCommand(client: ClientKind, url: string) {
  if (client === "codex") return `codex mcp add nexfiy --url "${url}"`;
  if (client === "claude") {
    return `claude mcp add --transport http nexfiy "${url}"`;
  }
  return JSON.stringify(
    { mcpServers: { nexfiy: { type: "http", url } } },
    null,
    2,
  );
}

async function copy(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

async function testMcpEnvironment(url: string) {
  const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
    import("@modelcontextprotocol/sdk/client/index.js"),
    import("@modelcontextprotocol/sdk/client/streamableHttp.js"),
  ]);
  const client = new Client({ name: "nexfiy-settings-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  try {
    await client.connect(transport);
    const result = await client.listTools();
    return result.tools.length;
  } finally {
    await client.close().catch(() => undefined);
  }
}

export function ClientEnvironmentDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<CreatedMcpEnvironment | null>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(t("dialogs.clientNexfiyWorkspace"));
  const [client, setClient] = useState<ClientKind>("codex");
  const [created, setCreated] = useState<CreatedMcpEnvironment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { success: boolean; message: string } | undefined
  >();

  const reset = () => {
    setName(t("dialogs.clientNexfiyWorkspace"));
    setClient("codex");
    setCreated(null);
    setIsCreating(false);
    setIsTesting(false);
    setTestResult(undefined);
  };

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const create = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    const environment = await onCreate(name);
    setIsCreating(false);
    if (environment) setCreated(environment);
  };

  const test = async () => {
    if (!created) return;
    setIsTesting(true);
    setTestResult(undefined);
    try {
      const toolCount = await testMcpEnvironment(created.url);
      setTestResult({
        success: true,
        message: `Connected successfully. ${toolCount} tools are available.`,
      });
    } catch (error) {
      logger.error(t("dialogs.clientTestFailed"), error);
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : t("dialogs.clientTestFailedTitle"),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const command = created ? clientCommand(client, created.url) : "";

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {created
              ? t("dialogs.clientConnectTitle")
              : t("dialogs.clientCreateTitle")}
          </DialogTitle>
          <DialogDescription>
            {created
              ? t("dialogs.clientCopyHint")
              : t("dialogs.clientPrivateUrlHint")}
          </DialogDescription>
        </DialogHeader>

        {!created ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mcp-environment-name">
                {t("dialogs.clientEnvName")}
              </Label>
              <Input
                id="mcp-environment-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("dialogs.clientEnvNameExample")}
                autoFocus
              />
            </div>
            <div className="bg-muted/40 rounded-lg border p-4 text-sm">
              <p className="font-medium">{t("dialogs.clientReadOnly")}</p>
              <p className="text-muted-foreground mt-1 leading-6">
                The generated environment exposes tools to list, search, and
                read non-archived documents. Revoke it at any time from Client
                access.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>{t("dialogs.clientMcpClient")}</Label>
              <Select
                value={client}
                onValueChange={(value) => setClient(value as ClientKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="codex">{t("dialogs.clientCodex")}</SelectItem>
                  <SelectItem value="claude">
                    {t("dialogs.clientClaude")}
                  </SelectItem>
                  <SelectItem value="generic">
                    {t("dialogs.clientGeneric")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="mcp-environment-url">
                  {t("dialogs.clientStreamableHttp")}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(created.url, t("dialogs.clientUrl"))}
                >
                  <Clipboard /> Copy URL
                </Button>
              </div>
              <Input
                id="mcp-environment-url"
                value={created.url}
                readOnly
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>{t("dialogs.clientConfig")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copy(command, t("dialogs.clientConfiguration"))
                  }
                >
                  <Clipboard /> Copy
                </Button>
              </div>
              <pre className="bg-muted max-h-40 overflow-auto rounded-lg border p-4 text-xs leading-5 whitespace-pre-wrap">
                {command}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
              <Button variant="outline" onClick={test} disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <FlaskConical />
                )}
                {isTesting ? "Testing…" : t("dialogs.clientTest")}
              </Button>
              {testResult ? (
                <p
                  className={`flex items-center gap-2 text-sm ${
                    testResult.success ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {testResult.success ? (
                    <Check className="size-4" />
                  ) : (
                    <CircleAlert className="size-4" />
                  )}
                  {testResult.message}
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <TerminalSquare className="size-4" /> Uses a real MCP client
                </p>
              )}
            </div>

            <p className="text-muted-foreground text-xs leading-5">
              This URL contains a secret token and is shown only once. Store it
              securely. If it is exposed, revoke this environment and create a
              new one.
            </p>
          </div>
        )}

        <DialogFooter>
          {created ? (
            <Button onClick={() => changeOpen(false)}>{t("dialogs.clientDone")}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => changeOpen(false)}>
                {t("dialogs.cancel")}
              </Button>
              <Button onClick={create} disabled={isCreating || !name.trim()}>
                {isCreating ? <Loader2 className="animate-spin" /> : null}
                {isCreating ? "Creating…" : t("dialogs.clientCreate")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
