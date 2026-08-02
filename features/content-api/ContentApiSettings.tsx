"use client";

import { useState } from "react";
import {
  Braces,
  Check,
  ChevronDown,
  Clipboard,
  Database,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/convex/_generated/dataModel";
import { DatabaseAccessPicker } from "./DatabaseAccessPicker";
import {
  useContentApi,
  type ContentSource,
  type CreatedContentApiKey,
} from "./useContentApi";
import { useBilling } from "@/features/billing/use-billing";
import { ProUpgradePrompt } from "@/features/billing/ProUpgradePrompt";
import posthog from "posthog-js";

type IntegrationKey = {
  _id: Id<"contentApiKeys">;
  name: string;
  tokenPrefix: string;
  dataSourceIds: Id<"dataSources">[];
  isEnabled: boolean;
  createdAt: number;
};

function IntegrationAccessEditor({
  integration,
  sources,
  onSave,
}: {
  integration: IntegrationKey;
  sources: ContentSource[];
  onSave: (selected: Id<"dataSources">[]) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState(integration.dataSourceIds);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanged =
    selected.length !== integration.dataSourceIds.length ||
    selected.some((id) => !integration.dataSourceIds.includes(id));

  const save = async () => {
    setIsSaving(true);
    await onSave(selected);
    setIsSaving(false);
  };

  return (
    <details className="group/access border-border/60 border-t px-4 py-3">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 text-xs transition-colors">
        <ChevronDown className="size-3.5 transition-transform group-open/access:rotate-180" />
        Manage database access
      </summary>
      <div className="mt-3 space-y-3">
        <DatabaseAccessPicker
          compact
          sources={sources}
          selected={selected}
          onChange={setSelected}
        />
        <Button
          size="sm"
          disabled={!hasChanged || selected.length === 0 || isSaving}
          onClick={() => void save()}
        >
          {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          Save access
        </Button>
      </div>
    </details>
  );
}

export function ContentApiSettings({ enabled }: { enabled: boolean }) {
  const contentApi = useContentApi(enabled);
  const billing = useBilling();
  const [name, setName] = useState("");
  const [selectedSources, setSelectedSources] = useState<Id<"dataSources">[]>(
    [],
  );
  const [createdKey, setCreatedKey] = useState<CreatedContentApiKey | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const endpoint = "/api/contents";

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  const create = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a name for this integration");
      return;
    }
    if (selectedSources.length === 0) {
      toast.error("Select at least one database");
      return;
    }
    setIsCreating(true);
    const result = await contentApi.create(trimmedName, selectedSources);
    setIsCreating(false);
    if (!result) return;
    posthog.capture("content_api_key_created", {
      database_count: selectedSources.length,
    });
    setCreatedKey(result);
    setName("");
    setSelectedSources([]);
  };

  if (contentApi.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
        <LoaderCircle className="size-4 animate-spin" /> Loading Content API…
      </div>
    );
  }

  if (!billing.isLoading && !billing.subscription?.hasPro) {
    return <ProUpgradePrompt feature="Content API" />;
  }

  const sources = contentApi.sources ?? [];

  return (
    <div className="space-y-6">
      <div className="border-border/40 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <Braces className="size-5 text-[#2383E2]" />
          <h2 className="text-lg font-bold">Content API</h2>
        </div>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          Turn selected workspace databases into structured content for
          websites, apps, and automations.
        </p>
      </div>

      {!contentApi.canManage ? (
        <div className="py-4">
          <p className="text-sm font-medium">Owner or admin access required</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Only workspace owners and admins can manage Content API access.
          </p>
        </div>
      ) : (
        <Tabs
          defaultValue="create"
          orientation="horizontal"
          className="w-full space-y-6"
        >
          <TabsList className="border-border/40 flex !h-9 w-full !flex-row flex-row items-center justify-start gap-8 rounded-none border-b bg-transparent p-0 group-data-[orientation=vertical]/tabs:!h-9 group-data-[orientation=vertical]/tabs:!flex-row">
            <TabsTrigger
              value="create"
              className="text-muted-foreground hover:text-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2 text-sm font-medium shadow-none transition-colors group-data-[orientation=vertical]/tabs:!w-auto after:hidden data-[state=active]:!border-x-transparent data-[state=active]:!border-t-transparent data-[state=active]:!border-b-[#2383E2] data-[state=active]:!bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#2383E2] dark:data-[state=active]:!border-x-transparent dark:data-[state=active]:!border-t-transparent dark:data-[state=active]:!border-b-[#2383E2] dark:data-[state=active]:!bg-transparent"
            >
              Create Key
            </TabsTrigger>
            <TabsTrigger
              value="keys"
              className="text-muted-foreground hover:text-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2 text-sm font-medium shadow-none transition-colors group-data-[orientation=vertical]/tabs:!w-auto after:hidden data-[state=active]:!border-x-transparent data-[state=active]:!border-t-transparent data-[state=active]:!border-b-[#2383E2] data-[state=active]:!bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#2383E2] dark:data-[state=active]:!border-x-transparent dark:data-[state=active]:!border-t-transparent dark:data-[state=active]:!border-b-[#2383E2] dark:data-[state=active]:!bg-transparent"
            >
              Active Keys ({contentApi.keys?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="endpoints"
              className="text-muted-foreground hover:text-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2 text-sm font-medium shadow-none transition-colors group-data-[orientation=vertical]/tabs:!w-auto after:hidden data-[state=active]:!border-x-transparent data-[state=active]:!border-t-transparent data-[state=active]:!border-b-[#2383E2] data-[state=active]:!bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#2383E2] dark:data-[state=active]:!border-x-transparent dark:data-[state=active]:!border-t-transparent dark:data-[state=active]:!border-b-[#2383E2] dark:data-[state=active]:!bg-transparent"
            >
              Endpoints
            </TabsTrigger>
          </TabsList>

          <div className="w-full min-w-0">
            {/* Vertical Tab 1: Create Key Form */}
            <TabsContent value="create" className="mt-0 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Create an integration key
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Choose exactly which databases this API key can read.
                </p>
              </div>

              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website, documentation, mobile app…"
                className="border-border/60 h-9 rounded-md bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#2383E2]"
                maxLength={100}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <Database className="size-3.5 text-[#2383E2]" /> Select
                    Databases
                  </p>
                  {sources.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-6 text-[11px]"
                      onClick={() =>
                        setSelectedSources(
                          selectedSources.length === sources.length
                            ? []
                            : sources.map((source) => source.id),
                        )
                      }
                    >
                      {selectedSources.length === sources.length
                        ? "Clear all"
                        : "Select all"}
                    </Button>
                  ) : null}
                </div>
                <DatabaseAccessPicker
                  sources={sources}
                  selected={selectedSources}
                  onChange={setSelectedSources}
                />
              </div>

              <Button
                className="h-9 rounded-md bg-[#2383E2] px-5 font-medium text-white hover:bg-[#1d6fc2]"
                disabled={isCreating || selectedSources.length === 0}
                onClick={() => void create()}
              >
                {isCreating ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-1.5 size-4" />
                )}
                Create key
              </Button>

              {createdKey ? (
                <div className="mt-4 rounded-lg border border-[#2383E2]/30 bg-[#2383E2]/10 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#2383E2]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        Copy this key now—it will not be shown again.
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <code className="bg-background border-border/60 min-w-0 flex-1 truncate rounded-md border px-3 py-1.5 font-mono text-xs">
                          {createdKey.token}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md"
                          onClick={() =>
                            void copy(createdKey.token, "API key copied")
                          }
                        >
                          <Clipboard className="mr-1.5 size-3.5" /> Copy
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => setCreatedKey(null)}
                      >
                        <Check className="mr-1 size-3.5" /> I saved it
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </TabsContent>

            {/* Vertical Tab 2: Active Keys List */}
            <TabsContent value="keys" className="mt-0 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Active integrations</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Manage API keys and update database permissions dynamically.
                </p>
              </div>

              <div className="divide-border/30 divide-y">
                {contentApi.keys?.length ? (
                  contentApi.keys.map((key) => {
                    const selectedNames = sources
                      .filter((source) => key.dataSourceIds.includes(source.id))
                      .map((source) => source.name);
                    return (
                      <div key={key._id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <KeyRound className="text-muted-foreground size-4 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {key.name}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {selectedNames.join(", ") ||
                                  "No available databases"}
                              </p>
                              <p className="text-muted-foreground/70 truncate font-mono text-[10px]">
                                {key.tokenPrefix}••••••••
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <Switch
                              checked={key.isEnabled}
                              aria-label={`${key.isEnabled ? "Disable" : "Enable"} ${key.name}`}
                              onCheckedChange={(isEnabled) =>
                                void contentApi.setEnabled(key._id, isEnabled)
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Revoke ${key.name}`}
                              onClick={() => void contentApi.revoke(key._id)}
                            >
                              <Trash2 className="text-destructive/80 hover:text-destructive size-4" />
                            </Button>
                          </div>
                        </div>
                        <IntegrationAccessEditor
                          integration={key}
                          sources={sources}
                          onSave={(selected) =>
                            contentApi.updateSources(key._id, selected)
                          }
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground py-8 text-center text-xs">
                    No active integration keys found.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Vertical Tab 3: REST Endpoints */}
            <TabsContent value="endpoints" className="mt-0 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  REST endpoint reference
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Send the key as an Authorization bearer token.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[endpoint, "/api/b"].map((path) => (
                  <div key={path} className="flex gap-2">
                    <code className="bg-muted/40 border-border/40 min-w-0 flex-1 truncate rounded-md border px-3 py-1.5 font-mono text-xs">
                      GET {path}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-md"
                      onClick={() => void copy(path, "Endpoint copied")}
                    >
                      <Clipboard className="mr-1.5 size-3.5" /> Copy
                    </Button>
                  </div>
                ))}
              </div>
              <pre className="bg-muted/50 text-foreground border-border/40 overflow-x-auto rounded-md border p-3 font-mono text-xs">
                <code>{`curl https://your-domain.com${endpoint} \\\n  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
              </pre>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
