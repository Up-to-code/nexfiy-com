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

const PROPERTY_TYPES: Array<{
  value: EditablePropertyType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "status", label: "Status" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "relation", label: "Relation" },
  { value: "rollup", label: "Rollup" },
  { value: "formula", label: "Formula" },
];

const ROLLUP_FUNCTIONS: Array<{ value: RollupFunction; label: string }> = [
  { value: "count", label: "Count related pages" },
  { value: "count_values", label: "Count values" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

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
            <DialogTitle>Add a property</DialogTitle>
            <DialogDescription>
              Properties give every page in this database structured data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="database-property-name">Name</Label>
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
            <Label htmlFor="database-property-type">Type</Label>
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
                <Label htmlFor="database-relation-target">Target database</Label>
                <Select
                  value={relationDataSourceId}
                  onValueChange={(value) =>
                    setRelationDataSourceId(value as Id<"dataSources">)
                  }
                >
                  <SelectTrigger id="database-relation-target">
                    <SelectValue placeholder="Choose a database" />
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
                      Show on target database
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Keep both sides of this relation synchronized.
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
                          sourceDatabase?.name || "Related pages",
                        );
                      }
                    }}
                  />
                </div>
                {createReciprocal ? (
                  <div className="space-y-2">
                    <Label htmlFor="database-reciprocal-name">
                      Property name on target
                    </Label>
                    <Input
                      id="database-reciprocal-name"
                      value={reciprocalName}
                      onChange={(event) => setReciprocalName(event.target.value)}
                      placeholder="Related pages"
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
                <Label htmlFor="database-rollup-relation">Relation</Label>
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
                    <SelectValue placeholder="Choose relation" />
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
                <Label htmlFor="database-rollup-property">Property</Label>
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
                    <SelectValue placeholder="Choose property" />
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
                <Label htmlFor="database-rollup-function">Calculate</Label>
                <Select
                  value={rollupFunction}
                  disabled={!selectedRollupTarget}
                  onValueChange={(value) =>
                    setRollupFunction(value as RollupFunction)
                  }
                >
                  <SelectTrigger id="database-rollup-function">
                    <SelectValue placeholder="Choose calculation" />
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
                  Add a relation property before creating a rollup.
                </p>
              ) : null}
            </div>
          ) : null}
          {type === "formula" ? (
            <div className="space-y-2">
              <Label htmlFor="database-formula-expression">Expression</Label>
              <Input
                id="database-formula-expression"
                value={formulaExpression}
                onChange={(event) => setFormulaExpression(event.target.value)}
                placeholder={'prop("Team capacity") * 1.2'}
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-muted-foreground text-xs">
                Reference a property with prop(&quot;Property name&quot;). Safe
                functions include if, empty, concat, round, min, max, length,
                lower, and upper.
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
              {isSaving ? "Adding…" : "Add property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
