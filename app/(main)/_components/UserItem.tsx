"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { cn } from "@/lib/utils";
import { ChevronsLeftRight, LogOut, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useSettings } from "@/hooks/useSettingsModal";
import { useRouter } from "next/navigation";

export const UserItem = ({ navDrawer }: { navDrawer?: boolean }) => {
  const { data: session } = authClient.useSession();
  const settings = useSettings();
  const router = useRouter();

  const { setInnerPopoverOpen } = useNavDrawer();

  const onOpenChange = (open: boolean) => {
    if (!navDrawer) return;
    setInnerPopoverOpen(open);
  };

  return (
    <DropdownMenu onOpenChange={navDrawer ? onOpenChange : undefined}>
      <DropdownMenuTrigger className={navDrawer ? "w-full" : ""}>
        <div
          role="button"
          className={cn(
            "hover:bg-primary/5 flex w-full items-center p-3 text-sm",
            navDrawer ? "justify-between rounded-full" : "rounded-none",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-x-2",
              navDrawer ? "w-full" : "max-w-39",
            )}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={session?.user.image ?? undefined} />
            </Avatar>
            <span className="line-clamp-1 text-start font-medium">
              {session?.user.name ?? "My workspace"}
            </span>
          </div>
          <ChevronsLeftRight className="text-muted-foreground ml-2 h-4 w-4 rotate-90" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80"
        align="start"
        alignOffset={11}
        forceMount
      >
        <div className="flex flex-col space-y-4 p-2">
          <p className="text-muted-foreground text-xs leading-none font-medium">
            {session?.user.email}
          </p>
          <div className="flex items-center gap-x-2">
            <div className="bg-secondary rounded-md p-1">
              <Avatar>
                <AvatarImage src={session?.user.image ?? undefined} />
              </Avatar>
            </div>
            <div className="space-y-1">
              <p className="line-clamp-1 text-sm">
                {session?.user.name ?? "My workspace"}
              </p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="text-muted-foreground w-full cursor-pointer"
        >
          <button
            onClick={() => {
              setInnerPopoverOpen(false);
              settings.onOpen("account");
            }}
          >
            <Settings className="text-muted-foreground size-4" />
            Workspace settings
          </button>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="group w-full cursor-pointer hover:text-black dark:hover:text-white!"
        >
          <button
            onClick={async () => {
              setInnerPopoverOpen(false);
              await authClient.signOut();
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut className="text-muted-foreground size-4" />
            <span className="text-muted-foreground transition-colors group-hover:text-black dark:group-hover:text-white">
              Log Out
            </span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
