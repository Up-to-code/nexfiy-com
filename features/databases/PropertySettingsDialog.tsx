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
            <DialogTitle>Property settings</DialogTitle>
            <DialogDescription>
              Rename this {property.type.replaceAll("_", " ")} property
              {property.type === "formula"
                ? " or update its safe expression."
                : "."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="database-property-settings-name">Name</Label>
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
                Formula
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
                Property references compile to stable IDs. Renaming a referenced
                property updates this readable expression without changing the
                dependency.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                isSaving ||
                !name.trim() ||
                (property.type === "formula" && !formulaExpression.trim())
              }
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
