"use client";

import { useState } from "react";
import { useQuery } from "convex/react";

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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import type { EditablePropertyType, RollupFunction } from "./useDatabase";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function AddPropertyDialog({
  open,
  onOpenChange,
  onAdd,
  dataSourceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSourceId: Id<"dataSources">;
  onAdd: (input: {
    name: string;
    type: EditablePropertyType;
    relationDataSourceId?: Id<"dataSources">;
    reciprocalName?: string;
    rollupRelationPropertyId?: Id<"databaseProperties">;
    rollupTargetPropertyId?: Id<"databaseProperties">;
    rollupFunction?: RollupFunction;
    formulaExpression?: string;
  }) => Promise<boolean>;
}) {
  const { t } = useI18n();

  const PROPERTY_TYPES: Array<{
    value: EditablePropertyType;
    label: string;
  }> = [
    { value: "text", label: t("dialogs.propertyText") },
    { value: "number", label: t("dialogs.propertyNumber") },
    { value: "status", label: t("dialogs.propertyStatus") },
    { value: "date", label: t("dialogs.propertyDate") },
    { value: "checkbox", label: t("dialogs.propertyCheckbox") },
    { value: "url", label: t("dialogs.propertyUrl") },
    { value: "relation", label: t("dialogs.propertyRelation") },
    { value: "rollup", label: t("dialogs.propertyRollup") },
    { value: "formula", label: t("dialogs.propertyFormula") },
  ];

  const ROLLUP_FUNCTIONS: Array<{ value: RollupFunction; label: string }> = [
    { value: "count", label: t("dialogs.rollupCountRelated") },
    { value: "count_values", label: t("dialogs.rollupCountValues") },
    { value: "sum", label: t("dialogs.rollupSum") },
    { value: "average", label: t("dialogs.rollupAverage") },
    { value: "min", label: t("dialogs.rollupMin") },
    { value: "max", label: t("dialogs.rollupMax") },
  ];

  const databases = useQuery(api.databases.listAvailable);
  const rollupOptions = useQuery(api.databases.getRollupConfigurationOptions, {
    dataSourceId,
  });
  const [name, setName] = useState("");
  const [type, setType] = useState<EditablePropertyType>("text");
  const [relationDataSourceId, setRelationDataSourceId] =
    useState<Id<"dataSources">>();
  const [createReciprocal, setCreateReciprocal] = useState(false);
  const [reciprocalName, setReciprocalName] = useState("");
  const [rollupRelationPropertyId, setRollupRelationPropertyId] =
    useState<Id<"databaseProperties">>();
  const [rollupTargetPropertyId, setRollupTargetPropertyId] =
    useState<Id<"databaseProperties">>();
  const [rollupFunction, setRollupFunction] = useState<RollupFunction>();
  const [formulaExpression, setFormulaExpression] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedRollupRelation = rollupOptions?.find(
    (option) => option.relationPropertyId === rollupRelationPropertyId,
  );
  const sourceDatabase = databases?.find(
    (database) => database.id === dataSourceId,
  );
  const selectedRollupTarget = selectedRollupRelation?.targetProperties.find(
    (property) => property.id === rollupTargetPropertyId,
  );
  const availableRollupFunctions = ROLLUP_FUNCTIONS.filter(
    (item) =>
      !["sum", "average", "min", "max"].includes(item.value) ||
      selectedRollupTarget?.type === "number",
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const added = await onAdd({
      name,
      type,
      relationDataSourceId,
      reciprocalName: createReciprocal ? reciprocalName : undefined,
      rollupRelationPropertyId,
      rollupTargetPropertyId,
      rollupFunction,
      formulaExpression: formulaExpression || undefined,
    });
    setIsSaving(false);
    if (!added) return;
    setName("");
    setType("text");
    setRelationDataSourceId(undefined);
    setCreateReciprocal(false);
    setReciprocalName("");
    setRollupRelationPropertyId(undefined);
    setRollupTargetPropertyId(undefined);
    setRollupFunction(undefined);
    setFormulaExpression("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{t("dialogs.propertyTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.propertyDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="database-property-name">
              {t("dialogs.propertyName")}
            </Label>
            <Input
              id="database-property-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Priority"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database-property-type">
              {t("dialogs.propertyType")}
            </Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as EditablePropertyType);
                if (value !== "relation") {
                  setRelationDataSourceId(undefined);
                  setCreateReciprocal(false);
                  setReciprocalName("");
                }
                if (value !== "rollup") {
                  setRollupRelationPropertyId(undefined);
                  setRollupTargetPropertyId(undefined);
                  setRollupFunction(undefined);
                }
                if (value !== "formula") setFormulaExpression("");
              }}
            >
              <SelectTrigger id="database-property-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "relation" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="database-relation-target">
                  {t("dialogs.propertyTargetDatabase")}
                </Label>
                <Select
                  value={relationDataSourceId}
                  onValueChange={(value) =>
                    setRelationDataSourceId(value as Id<"dataSources">)
                  }
                >
                  <SelectTrigger id="database-relation-target">
                    <SelectValue
                      placeholder={t("dialogs.propertyChooseDatabase")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {databases?.map((database) => (
                      <SelectItem key={database.id} value={database.id}>
                        {database.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/30 space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="database-reciprocal-relation">
                      {t("dialogs.propertyShowOnTarget")}
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {t("dialogs.propertyKeepSynced")}
                    </p>
                  </div>
                  <Switch
                    id="database-reciprocal-relation"
                    checked={createReciprocal}
                    disabled={!relationDataSourceId}
                    onCheckedChange={(checked) => {
                      setCreateReciprocal(checked);
                      if (checked && !reciprocalName) {
                        setReciprocalName(
                          sourceDatabase?.name ||
                            t("dialogs.propertyRelatedPages"),
                        );
                      }
                    }}
                  />
                </div>
                {createReciprocal ? (
                  <div className="space-y-2">
                    <Label htmlFor="database-reciprocal-name">
                      {t("dialogs.propertyTargetName")}
                    </Label>
                    <Input
                      id="database-reciprocal-name"
                      value={reciprocalName}
                      onChange={(event) => setReciprocalName(event.target.value)}
                      placeholder={t("dialogs.propertyRelatedPages")}
                      required
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {type === "rollup" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="database-rollup-relation">
                  {t("dialogs.propertyRelationLabel")}
                </Label>
                <Select
                  value={rollupRelationPropertyId}
                  onValueChange={(value) => {
                    setRollupRelationPropertyId(
                      value as Id<"databaseProperties">,
                    );
                    setRollupTargetPropertyId(undefined);
                    setRollupFunction(undefined);
                  }}
                >
                  <SelectTrigger id="database-rollup-relation">
                    <SelectValue
                      placeholder={t("dialogs.propertyChooseRelation")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {rollupOptions?.map((option) => (
                      <SelectItem
                        key={option.relationPropertyId}
                        value={option.relationPropertyId}
                      >
                        {option.relationName} → {option.targetDataSourceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="database-rollup-property">
                  {t("dialogs.propertyTargetProperty")}
                </Label>
                <Select
                  value={rollupTargetPropertyId}
                  disabled={!selectedRollupRelation}
                  onValueChange={(value) => {
                    setRollupTargetPropertyId(
                      value as Id<"databaseProperties">,
                    );
                    setRollupFunction(undefined);
                  }}
                >
                  <SelectTrigger id="database-rollup-property">
                    <SelectValue
                      placeholder={t("dialogs.propertyChooseProperty")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRollupRelation?.targetProperties.map(
                      (property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="database-rollup-function">
                  {t("dialogs.propertyCalculate")}
                </Label>
                <Select
                  value={rollupFunction}
                  disabled={!selectedRollupTarget}
                  onValueChange={(value) =>
                    setRollupFunction(value as RollupFunction)
                  }
                >
                  <SelectTrigger id="database-rollup-function">
                    <SelectValue
                      placeholder={t("dialogs.propertyChooseCalculation")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRollupFunctions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!rollupOptions?.length ? (
                <p className="text-muted-foreground text-sm sm:col-span-3">
                  {t("dialogs.propertyRollupHint")}
                </p>
              ) : null}
            </div>
          ) : null}
          {type === "formula" ? (
            <div className="space-y-2">
              <Label htmlFor="database-formula-expression">
                {t("dialogs.propertyExpression")}
              </Label>
              <Input
                id="database-formula-expression"
                value={formulaExpression}
                onChange={(event) => setFormulaExpression(event.target.value)}
                placeholder={'prop("Team capacity") * 1.2'}
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-muted-foreground text-xs">
                {t("dialogs.propertyFormulaHint")}
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
                (type === "relation" && !relationDataSourceId) ||
                (type === "relation" &&
                  createReciprocal &&
                  !reciprocalName.trim()) ||
                (type === "rollup" &&
                  (!rollupRelationPropertyId ||
                    !rollupTargetPropertyId ||
                    !rollupFunction)) ||
                (type === "formula" && !formulaExpression.trim())
              }
            >
              {isSaving ? t("dialogs.propertyAdding") : t("dialogs.propertyAdd")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
