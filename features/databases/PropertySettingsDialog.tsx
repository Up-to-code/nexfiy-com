"use client";

import { useState } from "react";

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

import type { useDatabase } from "./useDatabase";
import { useI18n } from "@/lib/i18n/I18nProvider";

type DatabaseProperty = NonNullable<
  ReturnType<typeof useDatabase>["database"]
>["properties"][number];

export function PropertySettingsDialog({
  property,
  open,
  onOpenChange,
  onSave,
}: {
  property: DatabaseProperty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    propertyId: DatabaseProperty["id"];
    name: string;
    formulaExpression?: string;
  }) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(property.name);
  const [formulaExpression, setFormulaExpression] = useState(
    property.formulaExpression ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const saved = await onSave({
      propertyId: property.id,
      name,
      formulaExpression:
        property.type === "formula" ? formulaExpression : undefined,
    });
    setIsSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{t("dialogs.propertySettingsTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.propertySettingsDescription", {
                type: property.type.replaceAll("_", " "),
                extra:
                  property.type === "formula"
                    ? t("dialogs.propertySettingsFormulaDesc")
                    : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="database-property-settings-name">
              {t("dialogs.propertySettingsName")}
            </Label>
            <Input
              id="database-property-settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </div>
          {property.type === "formula" ? (
            <div className="space-y-2">
              <Label htmlFor="database-property-settings-formula">
                {t("dialogs.propertySettingsFormula")}
              </Label>
              <Input
                id="database-property-settings-formula"
                value={formulaExpression}
                onChange={(event) => setFormulaExpression(event.target.value)}
                className="font-mono"
                maxLength={2_000}
                spellCheck={false}
                required
              />
              <p className="text-muted-foreground text-xs">
                {t("dialogs.propertySettingsHint")}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("dialogs.cancel")}
            </Button>
            <Button
              disabled={
                isSaving ||
                !name.trim() ||
                (property.type === "formula" && !formulaExpression.trim())
              }
            >
              {isSaving
                ? t("dialogs.saving")
                : t("dialogs.propertySettingsSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
