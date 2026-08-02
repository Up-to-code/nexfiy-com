"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettingsModal";
import { ModeToggle } from "../mode-toggle";
import { EditorFont, useEditorFont } from "@/hooks/useEditorFont";
import { useFocusMode } from "@/hooks/useFocusMode";
import { fontFamilies } from "@/lib/editorFont";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { McpSettings } from "@/components/settings/McpSettings";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowUpCircle,
  Braces,
  Building2,
  Check,
  LogOut,
  Palette,
  PlugZap,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { NexfiyProCheckout } from "@/features/billing/NexfiyProCheckout";
import { OrganizationSettings } from "@/features/organizations/OrganizationSettings";
import { ContentApiSettings } from "@/features/content-api/ContentApiSettings";
import { NEXFIY_PRO_PLAN } from "@/features/billing/plan-content";
import posthog from "posthog-js";

const FONTS: { label: string; value: EditorFont }[] = [
  { label: "Default", value: "default" },
  { label: "Sans", value: "Lora" },
  { label: "Mono", value: "JetBrains Mono" },
];

export const SettingsModal = () => {
  const settings = useSettings();
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const { editorFont, setEditorFont } = useEditorFont({
    enabled: settings.isOpen,
  });
  const { focusMode, setFocusMode } = useFocusMode({
    enabled: settings.isOpen,
  });

  const tabTriggerClass =
    "w-full justify-start gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-accent dark:data-[state=active]:text-foreground border-none after:hidden dark:border-none focus-visible:ring-0 focus:outline-none";

  return (
    <Dialog open={settings.isOpen} onOpenChange={settings.onClose}>
      <DialogContent
        showCloseButton={false}
        className="bg-background border-border/70 flex h-[min(720px,calc(100vh-4rem))] max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-2xl focus:outline-none sm:max-w-4xl sm:flex-row"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Workspace settings</DialogTitle>
        </DialogHeader>

        <Tabs
          orientation="vertical"
          value={settings.tab}
          onValueChange={(value) =>
            settings.setTab(value as typeof settings.tab)
          }
          className="flex h-full max-h-full w-full flex-col overflow-hidden sm:flex-row"
        >
          {/* Left Sidebar */}
          <TabsList className="bg-sidebar border-border/40 flex !h-full w-full shrink-0 flex-col items-stretch justify-start rounded-none border-r p-0 group-data-[orientation=vertical]/tabs:!h-full sm:w-[220px]">
            <div className="flex-1 overflow-y-auto px-2 py-4">
              {/* Account Group */}
              <div className="mb-4 space-y-0.5">
                <p className="text-muted-foreground/70 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                  Account
                </p>
                <TabsTrigger value="account" className={tabTriggerClass}>
                  <UserRound className="size-4 shrink-0" />
                  <span className="truncate">Account</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className={tabTriggerClass}>
                  <Palette className="size-4 shrink-0" />
                  <span className="truncate">Preferences</span>
                </TabsTrigger>
              </div>

              {/* Workspace Group */}
              <div className="mb-4 space-y-0.5">
                <p className="text-muted-foreground/70 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                  Workspace
                </p>
                <TabsTrigger value="organization" className={tabTriggerClass}>
                  <Building2 className="size-4 shrink-0" />
                  <span className="truncate">Workspace</span>
                </TabsTrigger>
              </div>

              {/* Features Group */}
              <div className="mb-4 space-y-0.5">
                <p className="text-muted-foreground/70 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                  Features
                </p>
                <TabsTrigger value="api" className={tabTriggerClass}>
                  <Braces className="size-4 shrink-0" />
                  <span className="truncate">API</span>
                </TabsTrigger>
                <TabsTrigger value="mcp" className={tabTriggerClass}>
                  <PlugZap className="size-4 shrink-0" />
                  <span className="truncate">MCP</span>
                </TabsTrigger>
              </div>

              {/* Access & billing Group */}
              <div className="mb-4 space-y-0.5">
                <p className="text-muted-foreground/70 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                  Access & billing
                </p>
                <TabsTrigger
                  value="billing"
                  className={cn(
                    tabTriggerClass,
                    "hover:bg-[#2383E2]/10 hover:text-[#2383E2] data-[state=active]:bg-[#2383E2]/10 data-[state=active]:text-[#2383E2]",
                  )}
                >
                  <ArrowUpCircle className="size-4 shrink-0 text-[#2383E2]" />
                  <span className="truncate text-[#2383E2]">Upgrade plan</span>
                </TabsTrigger>
              </div>
            </div>
          </TabsList>

          {/* Right Main Content */}
          <div className="bg-background relative h-full min-w-0 flex-1 overflow-y-auto">
            <DialogClose className="ring-offset-background hover:bg-muted focus:ring-ring absolute top-4 right-4 rounded-sm p-1.5 opacity-70 transition-colors hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
              <X className="size-5" />
              <span className="sr-only">Close</span>
            </DialogClose>

            <div className="px-8 py-10 md:px-12 md:py-12">
              <TabsContent value="account" className="mt-0 space-y-6">
                <div className="border-border/40 border-b pb-5">
                  <h2 className="text-lg font-bold">Account</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Manage your profile and account credentials.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar className="size-12">
                      <AvatarImage src={session?.user.image ?? undefined} />
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {session?.user.name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {session?.user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-md"
                    onClick={async () => {
                      await authClient.signOut();
                      posthog.reset();
                      settings.onClose();
                      router.push("/");
                      router.refresh();
                    }}
                  >
                    <LogOut className="mr-1.5 size-3.5" /> Log out
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="organization" className="mt-0">
                <OrganizationSettings />
              </TabsContent>

              <TabsContent value="billing" className="mt-0 space-y-6">
                <div className="border-border/40 border-b pb-5">
                  <h2 className="text-lg font-bold">Nexfiy Pro</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Unlock databases, APIs, MCP, workspaces, and collaboration.
                  </p>
                </div>

                <div className="space-y-6 py-2">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2383E2]/15 px-3 py-1 text-xs font-semibold tracking-wider text-[#2383E2] uppercase">
                        <Sparkles className="size-3.5" /> Pro
                      </span>
                      <h3 className="mt-3 text-3xl font-extrabold">
                        $5{" "}
                        <span className="text-muted-foreground text-sm font-normal">
                          / seat / month
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2 text-sm sm:grid-cols-2">
                    {NEXFIY_PRO_PLAN.features.map((feature) => (
                      <div
                        key={feature}
                        className="text-foreground/90 flex items-center gap-2"
                      >
                        <Check className="size-4 shrink-0 text-[#2383E2]" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="border-border/40 border-t pt-6">
                    <NexfiyProCheckout compact />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-xl font-bold">Preferences</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Choose how you want Notion to look and behave
                  </p>
                </div>

                <div className="flex flex-col">
                  {/* Appearance Section */}
                  <div className="border-border/40 flex items-center justify-between gap-6 border-b py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
                      <Label className="text-sm font-medium">Theme</Label>
                      <span className="text-muted-foreground text-xs">
                        Choose a theme for Notion on this device
                      </span>
                    </div>
                    <div className="shrink-0">
                      <ModeToggle />
                    </div>
                  </div>

                  {/* Editor font Section */}
                  <div className="border-border/40 flex items-center justify-between gap-6 border-b py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
                      <Label className="text-sm font-medium">Editor font</Label>
                      <span className="text-muted-foreground text-xs">
                        Choose the font used in the editor
                      </span>
                    </div>
                    <div className="grid w-64 shrink-0 grid-cols-3 gap-2">
                      {FONTS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setEditorFont(option.value)}
                          className={cn(
                            "border-border/50 hover:bg-muted/50 flex flex-col items-center justify-center rounded-lg border px-3 py-2.5 text-xs transition-colors",
                            editorFont === option.value &&
                              "border-primary bg-primary/10 text-primary ring-primary/40 font-semibold ring-1",
                          )}
                        >
                          <span
                            className="mb-0.5 text-lg font-bold"
                            style={{
                              fontFamily: fontFamilies[option.value],
                            }}
                          >
                            Ag
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Focus mode Section */}
                  <div className="border-border/40 flex items-center justify-between gap-6 border-b py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
                      <Label className="text-sm font-medium">Focus mode</Label>
                      <span className="text-muted-foreground text-xs">
                        Collapse sidebar and topbar to minimize distractions
                      </span>
                      <span className="text-muted-foreground/80 mt-1 text-[11px]">
                        Shortcut:
                        <kbd className="border-border/50 bg-muted/50 ml-1 inline-flex items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium shadow-2xs">
                          Ctrl + Shift + F
                        </kbd>
                      </span>
                    </div>
                    <div className="shrink-0">
                      <Switch
                        checked={focusMode}
                        onCheckedChange={setFocusMode}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mcp" className="mt-0">
                <McpSettings
                  enabled={settings.isOpen && settings.tab === "mcp"}
                />
              </TabsContent>

              <TabsContent value="api" className="mt-0">
                <ContentApiSettings
                  enabled={settings.isOpen && settings.tab === "api"}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
