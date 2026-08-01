"use client";

import {
  Dialog,
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
import { LogOut, Palette, PlugZap, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

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

  return (
    <Dialog open={settings.isOpen} onOpenChange={settings.onClose}>
      <DialogContent className="dark:bg-dark grid h-[min(760px,calc(100vh-2rem))] max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Workspace settings</DialogTitle>
        </DialogHeader>
        <Tabs
          orientation="vertical"
          value={settings.tab}
          onValueChange={(value) =>
            settings.setTab(value as typeof settings.tab)
          }
          className="grid h-full min-h-0 grid-cols-[72px_minmax(0,1fr)] gap-0 sm:grid-cols-[210px_minmax(0,1fr)]"
        >
          <TabsList
            className="bg-muted/30 h-full w-full items-stretch justify-start gap-1 rounded-none border-r p-3"
            variant="line"
          >
            <TabsTrigger value="account">
              <UserRound />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Palette />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="mcp">
              <PlugZap />
              <span className="hidden sm:inline">MCP</span>
            </TabsTrigger>
          </TabsList>
          <div className="min-w-0 overflow-y-auto px-4 py-6 sm:px-8 sm:py-7">
            <TabsContent value="account" className="space-y-6">
              <div>
                <h3 className="font-medium">Account</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your Better Auth profile for this workspace.
                </p>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <Avatar className="size-12">
                  <AvatarImage src={session?.user.image ?? undefined} />
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{session?.user.name}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {session?.user.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await authClient.signOut();
                    settings.onClose();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <LogOut /> Log out
                </Button>
              </div>
            </TabsContent>
            <TabsContent
              value="preferences"
              className="divide-primary/10 divide-y"
            >
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col gap-y-1">
                  <Label>Appearance</Label>
                  <span className="text-muted-foreground text-[0.8rem]">
                    Customize how Zotion looks on your device.
                  </span>
                </div>
                <ModeToggle />
              </div>
              <div className="flex flex-col gap-y-3 py-2">
                <div className="flex flex-col gap-y-1">
                  <Label>Editor font</Label>
                  <span className="text-muted-foreground text-[0.8rem]">
                    Choose the font used in the editor.
                  </span>
                </div>
                <div className="flex gap-2">
                  {FONTS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEditorFont(option.value)}
                      className={cn(
                        "hover:bg-primary/5 flex flex-1 flex-col items-center gap-1 rounded-md border px-3 py-2 text-sm transition",
                        editorFont === option.value && "ring-primary ring",
                      )}
                    >
                      <span
                        className="text-xl font-medium"
                        style={{
                          fontFamily: fontFamilies[option.value],
                        }}
                      >
                        Ag
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex flex-col gap-y-1">
                  <Label>Focus mode</Label>
                  <span className="text-muted-foreground text-[0.8rem]">
                    Collapse the sidebar and topbar to minimize distractions and
                    focus on your content.
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Shortcut:
                    <kbd className="bg-muted text-muted-foreground pointer-events-none ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[.625rem] font-medium opacity-100 select-none md:inline-flex dark:bg-neutral-700">
                      Ctrl + Shift + F
                    </kbd>
                  </span>
                </div>
                <Switch checked={focusMode} onCheckedChange={setFocusMode} />
              </div>
            </TabsContent>
            <TabsContent value="mcp">
              <McpSettings
                enabled={settings.isOpen && settings.tab === "mcp"}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
