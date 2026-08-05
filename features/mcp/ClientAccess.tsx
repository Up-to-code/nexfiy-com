"use client";

import { useState } from "react";
import { Cable, CircleAlert, Clock3, Plus, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { useMcpEnvironments } from "./useMcpEnvironments";

export function ClientAccess({
  enabled,
  onCreate,
}: {
  enabled: boolean;
  onCreate: () => void;
}) {
  const environments = useMcpEnvironments(enabled);
  const { t } = useI18n();
  const [environmentToRemove, setEnvironmentToRemove] = useState<{
    id: Parameters<typeof environments.remove>[0];
    name: string;
  } | null>(null);

  const remove = async (id: Parameters<typeof environments.remove>[0]) => {
    await environments.remove(id);
    setEnvironmentToRemove(null);
  };

  if (environments.isLoading) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Loading client environments…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!environments.environments?.length ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
          <Cable className="text-muted-foreground mb-3 size-8" />
          <p className="font-medium">
            Connect Codex, Claude, or another client
          </p>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Create a private Streamable HTTP environment and copy its URL into
            your MCP client.
          </p>
          <Button className="mt-4" size="sm" onClick={onCreate}>
            <Plus /> Create client environment
          </Button>
        </div>
      ) : null}

      {environments.environments?.map((environment) => (
        <div
          key={environment._id}
          className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
        >
          <span className="bg-muted flex size-10 items-center justify-center rounded-md">
            <Cable className="size-4" />
          </span>
          <div className="min-w-48 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{environment.name}</p>
              {!environment.isEnabled ? (
                <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                  Disabled
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
              Token {environment.tokenPrefix}••••••••
            </p>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
              {environment.lastConnectedAt ? (
                <>
                  <Clock3 className="size-3" /> Last connected by{" "}
                  {environment.lastClientName ?? "an MCP client"}
                </>
              ) : (
                <>
                  <CircleAlert className="size-3" /> Not connected yet
                </>
              )}
            </p>
          </div>
          <Switch
            checked={environment.isEnabled}
            onCheckedChange={(checked) =>
              environments.setEnabled(environment._id, checked)
            }
            aria-label={`Enable ${environment.name}`}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={() =>
              setEnvironmentToRemove({
                id: environment._id,
                name: environment.name,
              })
            }
          >
            <Trash2 />
            <span className="sr-only">
              {t("dialogs.clientRevoke", { name: environment.name })}
            </span>
          </Button>
        </div>
      ))}

      {environments.environments?.length ? (
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus /> Create another environment
        </Button>
      ) : null}

      <AlertDialog
        open={environmentToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setEnvironmentToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.clientRevokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {environmentToRemove?.name ?? t("dialogs.clientRevokeDescription")}{" "}
              will stop working immediately. Any client using its private URL
              will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogs.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (environmentToRemove) {
                  void remove(environmentToRemove.id);
                }
              }}
            >
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
