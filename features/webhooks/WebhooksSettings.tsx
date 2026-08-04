"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Clipboard,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import posthog from "posthog-js";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBilling } from "@/features/billing/use-billing";
import { ProUpgradePrompt } from "@/features/billing/ProUpgradePrompt";
import {
  useWebhooks,
  type WebhookKeyView,
  type WebhookPermission,
} from "./useWebhooks";

const PERMISSIONS: {
  value: WebhookPermission;
  label: string;
  hint: string;
}[] = [
  { value: "read", label: "Read", hint: "List and read pages" },
  { value: "create", label: "Create", hint: "Create pages" },
  {
    value: "update",
    label: "Update",
    hint: "Edit pages, blocks, and move blocks",
  },
  { value: "delete", label: "Delete", hint: "Archive pages" },
  { value: "add_blocks", label: "Add blocks", hint: "Append blocks to pages" },
];

function permissionLabel(value: WebhookPermission) {
  return PERMISSIONS.find((permission) => permission.value === value)?.label ??
    value;
}

function PermissionPicker({
  selected,
  onChange,
}: {
  selected: WebhookPermission[];
  onChange: (next: WebhookPermission[]) => void;
}) {
  const toggle = (value: WebhookPermission) => {
    onChange(
      selected.includes(value)
        ? selected.filter((permission) => permission !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="space-y-1.5">
      {PERMISSIONS.map((permission) => {
        const active = selected.includes(permission.value);
        return (
          <button
            key={permission.value}
            type="button"
            onClick={() => toggle(permission.value)}
            className="border-border/50 hover:bg-muted/50 flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors"
          >
            <span>
              <span className="block text-sm font-medium">
                {permission.label}
              </span>
              <span className="text-muted-foreground block text-xs">
                {permission.hint}
              </span>
            </span>
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                active
                  ? "border-[#2383E2] bg-[#2383E2] text-white"
                  : "border-border bg-transparent"
              }`}
            >
              {active ? <Check className="size-3.5" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PermissionEditor({
  permissions,
  onSave,
}: {
  permissions: WebhookPermission[];
  onSave: (next: WebhookPermission[]) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState(permissions);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanged =
    selected.length !== permissions.length ||
    selected.some((permission) => !permissions.includes(permission));

  const save = async () => {
    setIsSaving(true);
    await onSave(selected);
    setIsSaving(false);
  };

  return (
    <details className="border-border/60 border-t px-4 py-3">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 text-xs transition-colors">
        <ChevronDown className="size-3.5 transition-transform group-open/access:rotate-180" />
        Manage permissions
      </summary>
      <div className="mt-3 space-y-3">
        <PermissionPicker selected={selected} onChange={setSelected} />
        <Button
          size="sm"
          disabled={!hasChanged || selected.length === 0 || isSaving}
          onClick={() => void save()}
        >
          {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          Save permissions
        </Button>
      </div>
    </details>
  );
}

export function WebhooksSettings({ enabled }: { enabled: boolean }) {
  const webhooks = useWebhooks(enabled);
  const billing = useBilling();
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<
    WebhookPermission[]
  >([]);
  const [createdKey, setCreatedKey] = useState<{
    token: string;
    endpoint: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<WebhookKeyView | null>(null);

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  const create = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a name for this webhook key");
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error("Select at least one permission");
      return;
    }
    setIsCreating(true);
    const result = await webhooks.create(trimmedName, selectedPermissions);
    setIsCreating(false);
    if (!result) return;
    posthog.capture("webhook_key_created", {
      permission_count: selectedPermissions.length,
    });
    const endpoint = `${window.location.origin}/api/webhooks/${result.token}`;
    setCreatedKey({ token: result.token, endpoint });
    setName("");
    setSelectedPermissions([]);
  };

  if (webhooks.isLoading) {
    return (
      <div className="space-y-5 py-2" aria-label="Loading webhook settings">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!billing.isLoading && !billing.subscription?.hasPro) {
    return <ProUpgradePrompt feature="Webhooks" />;
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="border-border/40 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <Webhook className="size-5 text-[#2383E2]" />
          <h2 className="text-lg font-bold">Webhooks</h2>
        </div>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          Create authorization keys that let external services read, write, and
          manage your pages through a single dynamic endpoint.
        </p>
      </div>

      {!webhooks.canManage ? (
        <div className="py-4">
          <p className="text-sm font-medium">Owner or admin access required</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Only workspace owners and admins can manage webhook keys.
          </p>
        </div>
      ) : (
        <Tabs
          defaultValue="create"
          orientation="horizontal"
          className="w-full space-y-6"
        >
          <TabsList
            variant="line"
            className="border-border/40 flex !h-10 w-full !flex-row items-center justify-start gap-8 rounded-none border-b bg-transparent p-0 group-data-[orientation=vertical]/tabs:!h-10 group-data-[orientation=vertical]/tabs:!flex-row"
          >
            <TabsTrigger
              value="create"
              className="!h-full !w-auto flex-none justify-start rounded-none border-0 px-0 text-sm shadow-none group-data-[orientation=vertical]/tabs:!w-auto after:!inset-x-0 after:!top-auto after:!right-0 after:!bottom-[-1px] after:!left-0 after:!h-0.5 after:!w-auto after:!bg-[#2383E2] data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent"
            >
              Create Key
            </TabsTrigger>
            <TabsTrigger
              value="keys"
              className="!h-full !w-auto flex-none justify-start rounded-none border-0 px-0 text-sm shadow-none group-data-[orientation=vertical]/tabs:!w-auto after:!inset-x-0 after:!top-auto after:!right-0 after:!bottom-[-1px] after:!left-0 after:!h-0.5 after:!w-auto after:!bg-[#2383E2] data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent"
            >
              Active Keys ({webhooks.keys?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="endpoints"
              className="!h-full !w-auto flex-none justify-start rounded-none border-0 px-0 text-sm shadow-none group-data-[orientation=vertical]/tabs:!w-auto after:!inset-x-0 after:!top-auto after:!right-0 after:!bottom-[-1px] after:!left-0 after:!h-0.5 after:!w-auto after:!bg-[#2383E2] data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent"
            >
              Endpoints
            </TabsTrigger>
          </TabsList>

          <div className="w-full min-w-0">
            {/* Vertical Tab 1: Create Key Form */}
            <TabsContent value="create" className="mt-0 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Create a webhook key</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Choose which page operations this key is allowed to perform.
                </p>
              </div>

              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="CI deployment, CMS sync, mobile app…"
                className="border-border/60 h-9 rounded-md bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#2383E2]"
                maxLength={100}
              />

              <div className="space-y-2">
                <p className="text-xs font-semibold">Permissions</p>
                <PermissionPicker
                  selected={selectedPermissions}
                  onChange={setSelectedPermissions}
                />
              </div>

              <Button
                className="h-9 rounded-md bg-[#2383E2] px-5 font-medium text-white hover:bg-[#1d6fc2]"
                disabled={isCreating || selectedPermissions.length === 0}
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
                        Copy this token now—it will not be shown again.
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
                            void copy(createdKey.token, "Webhook token copied")
                          }
                        >
                          <Clipboard className="mr-1.5 size-3.5" /> Copy
                        </Button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <code className="bg-background border-border/60 min-w-0 flex-1 truncate rounded-md border px-3 py-1.5 font-mono text-xs">
                          POST {createdKey.endpoint}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md"
                          onClick={() =>
                            void copy(
                              createdKey.endpoint,
                              "Webhook URL copied",
                            )
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
                <h3 className="text-sm font-semibold">Active webhook keys</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Manage webhook keys and update their permissions dynamically.
                </p>
              </div>

              <div className="divide-border/30 divide-y">
                {webhooks.keys?.length ? (
                  webhooks.keys.map((key) => (
                    <div key={key._id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <KeyRound className="text-muted-foreground size-4 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {key.name}
                            </p>
                            <p className="text-muted-foreground/70 truncate font-mono text-[10px]">
                              {key.tokenPrefix}••••••••
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="flex flex-wrap justify-end gap-1">
                            {key.permissions.map((permission) => (
                              <span
                                key={permission}
                                className="bg-muted/60 border-border/40 rounded border px-1.5 py-0.5 text-[10px] font-medium"
                              >
                                {permissionLabel(permission)}
                              </span>
                            ))}
                          </span>
                          <Switch
                            checked={key.isEnabled}
                            aria-label={`${key.isEnabled ? "Disable" : "Enable"} ${key.name}`}
                            onCheckedChange={(isEnabled) =>
                              void webhooks.setEnabled(key._id, isEnabled)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Revoke ${key.name}`}
                            onClick={() => setKeyToRevoke(key)}
                          >
                            <Trash2 className="text-destructive/80 hover:text-destructive size-4" />
                          </Button>
                        </div>
                      </div>
                      <PermissionEditor
                        permissions={key.permissions}
                        onSave={(next) =>
                          webhooks.updatePermissions(key._id, next)
                        }
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground py-8 text-center text-xs">
                    No active webhook keys found.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Vertical Tab 3: Endpoints */}
            <TabsContent value="endpoints" className="mt-0 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Dynamic webhook endpoint
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Send a POST request with the key as a path segment or bearer
                  token and an action in the JSON body.
                </p>
              </div>
              <pre className="bg-muted/50 text-foreground border-border/40 overflow-x-auto rounded-md border p-3 font-mono text-xs">
                <code>{`curl -X POST https://your-domain.com/api/webhooks/YOUR_TOKEN \\\n  -H "Content-Type: application/json" \\\n  -d '{ "action": "list_pages" }'`}</code>
              </pre>
              <div>
                <h3 className="text-sm font-semibold">Supported actions</h3>
                <div className="text-muted-foreground mt-1 grid gap-1.5 text-xs sm:grid-cols-2">
                  <span>
                    <code className="text-foreground font-mono">list_pages</code>{" "}
                    — read
                  </span>
                  <span>
                    <code className="text-foreground font-mono">get_page</code>{" "}
                    — read
                  </span>
                  <span>
                    <code className="text-foreground font-mono">
                      create_page
                    </code>{" "}
                    — create
                  </span>
                  <span>
                    <code className="text-foreground font-mono">
                      update_page
                    </code>{" "}
                    — update
                  </span>
                  <span>
                    <code className="text-foreground font-mono">
                      delete_page
                    </code>{" "}
                    — delete
                  </span>
                  <span>
                    <code className="text-foreground font-mono">
                      create_blocks
                    </code>{" "}
                    — add_blocks
                  </span>
                  <span>
                    <code className="text-foreground font-mono">
                      update_block
                    </code>{" "}
                    — update
                  </span>
                  <span>
                    <code className="text-foreground font-mono">
                      move_block
                    </code>{" "}
                    — update
                  </span>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      )}
      <AlertDialog
        open={keyToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setKeyToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke webhook key?</AlertDialogTitle>
            <AlertDialogDescription>
              {keyToRevoke?.name ?? "This key"} will stop working immediately.
              Automations using it will no longer be able to read or write
              workspace pages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!keyToRevoke) return;
                void webhooks.revoke(keyToRevoke._id);
                setKeyToRevoke(null);
              }}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
