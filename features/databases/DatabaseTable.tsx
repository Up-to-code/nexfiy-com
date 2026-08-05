"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  GalleryVerticalEnd,
  ListFilter,
  Plus,
  Table2,
  Trash2,
  Workflow,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

import { AddPropertyDialog } from "./AddPropertyDialog";
import { DatabaseBoard } from "./DatabaseBoard";
import { DatabaseCalendar } from "./DatabaseCalendar";
import { DatabaseGrid } from "./DatabaseGrid";
import { DatabaseTimeline } from "./DatabaseTimeline";
import { useDatabase } from "./useDatabase";
import { ViewSettingsDialog } from "./ViewSettingsDialog";
import { PropertySettingsDialog } from "./PropertySettingsDialog";
import { DatabaseRowSidePeek } from "./DatabaseRowSidePeek";

const VIEW_ICONS = {
  table: Table2,
  board: GalleryVerticalEnd,
  calendar: CalendarDays,
  timeline: ListFilter,
};

export function DatabaseTable({
  documentId,
  dataSourceId,
  initialViewId,
  embedded = false,
  readOnly = false,
}: {
  documentId?: Id<"documents">;
  dataSourceId?: Id<"dataSources">;
  initialViewId?: Id<"databaseViews">;
  embedded?: boolean;
  readOnly?: boolean;
}) {
  const [selectedViewId, setSelectedViewId] = useState<
    Id<"databaseViews"> | undefined
  >(initialViewId);
  const databaseState = useDatabase(documentId, selectedViewId, dataSourceId);
  const { t } = useI18n();
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isConfiguringView, setIsConfiguringView] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<
    Id<"databaseProperties"> | undefined
  >();
  const [openRowId, setOpenRowId] = useState<Id<"documents">>();
  const database = databaseState.database;
  const activeView = database?.views.find(
    (view) => view.id === database.activeViewId,
  );
  const editingProperty = database?.properties.find(
    (property) => property.id === editingPropertyId,
  );
  const visibleProperties = useMemo(() => {
    if (!database) return [];
    if (!activeView) return database.properties;
    const visible = new Set(activeView.visiblePropertyIds);
    return database.properties.filter((property) => visible.has(property.id));
  }, [activeView, database]);
  const createAndOpenRow = async (
    initialValues?: Parameters<typeof databaseState.addRow>[1],
    templateId?: Id<"databaseRowTemplates">,
  ) => {
    if (!database) return;
    const rowId = await databaseState.addRow(
      database.dataSource.id,
      initialValues,
      templateId,
    );
    if (rowId) setOpenRowId(rowId);
  };

  if (databaseState.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!database) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        This database is unavailable.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3",
        embedded ? "pb-2" : "pb-16",
        readOnly &&
          "[&_[data-view-tab]]:pointer-events-auto [&_button]:pointer-events-none [&_button]:select-none [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none",
      )}
      aria-readonly={readOnly}
      onKeyDownCapture={(event) => {
        if (!readOnly) return;
        const target = event.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLButtonElement &&
            !target.hasAttribute("data-view-tab"))
        ) {
          event.preventDefault();
        }
      }}
    >
      <div className="border-border/40 flex flex-wrap items-center justify-between gap-3 border-b pb-1">
        <div className="flex items-center gap-0.5">
          {database.views.map((view) => {
            const Icon = VIEW_ICONS[view.type];
            const isActive = view.id === activeView?.id;
            const deleteView = () => {
              if (database.views.length <= 1) {
                toast.error(t("dialogs.tableAtLeastOneView"));
                return;
              }
              void databaseState.deleteView(view.id).then((deleted) => {
                if (!deleted) return;
                setSelectedViewId((current) =>
                  current === view.id
                    ? database.views.find(
                        (candidate) => candidate.id !== view.id,
                      )?.id
                    : current,
                );
              });
            };
            return (
              <div
                key={view.id}
                className={cn(
                  "group/tab flex items-center border-b-2 border-transparent transition-colors",
                  isActive && "border-foreground",
                )}
              >
                <button
                  type="button"
                  data-view-tab
                  className={cn(
                    "text-muted-foreground/70 hover:text-foreground py-1.5 pl-2.5 pr-1 text-xs font-medium transition-colors",
                    isActive && "text-foreground font-semibold",
                  )}
                  onClick={() => setSelectedViewId(view.id)}
                >
                  {view.name}
                </button>
                {!readOnly ? (
                  <>
                    <button
                      type="button"
                      data-view-tab
                      aria-label={`Close ${view.name} view`}
                      title={t("dialogs.tableDeleteView")}
                      onClick={deleteView}
                      className={cn(
                        "text-muted-foreground/60 hover:text-foreground hover:bg-accent/60 mr-0.5 rounded p-0.5 transition-all",
                        isActive
                          ? "opacity-100"
                          : "opacity-0 group-hover/tab:opacity-100",
                      )}
                    >
                      <X className="size-3" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          data-view-tab
                          aria-label={`${view.name} view options`}
                          className={cn(
                            "text-muted-foreground/60 hover:text-foreground hover:bg-accent/60 mr-1 rounded p-1 transition-colors",
                            isActive && "text-foreground",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="text-muted-foreground/70 text-xs">
                          View type
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(
                          [
                            ["table", "Table", Table2],
                            ["board", "Pipeline", Workflow],
                            ["calendar", "Calendar", CalendarDays],
                            ["timeline", "Timeline", ListFilter],
                          ] as const
                        ).map(([type, label, TypeIcon]) => (
                          <DropdownMenuItem
                            key={type}
                            className="cursor-pointer text-xs"
                            disabled={type === view.type}
                            onSelect={() => {
                              if (type === view.type) return;
                              void databaseState.updateView({
                                viewId: view.id,
                                type,
                              });
                            }}
                          >
                            {type === view.type ? (
                              <Check className="mr-1.5 size-3.5" />
                            ) : (
                              <span className="mr-1.5 inline-block size-3.5" />
                            )}
                            <TypeIcon className="mr-1.5 size-3.5" />
                            {label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-xs text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                          onSelect={deleteView}
                        >
                          <Trash2 className="mr-1.5 size-3.5" />{" "}
                          {t("dialogs.tableDeleteView")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Icon
                    className={cn(
                      "text-muted-foreground/60 mr-1 size-3.5",
                      isActive && "text-foreground",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        {!readOnly ? (
          <div className="flex items-center gap-1.5 pb-1">
            {activeView ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/80 hover:text-foreground h-7 px-2 text-xs font-normal"
                onClick={() => setIsConfiguringView(true)}
              >
                <SlidersHorizontal className="size-3.5" /> View settings
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground/80 hover:text-foreground h-7 px-2 text-xs font-normal"
                >
                  <Plus className="size-3.5" /> View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-muted-foreground/70 text-xs">
                  Add a view
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(
                  [
                    ["table", "Table", Table2],
                    ["board", "Pipeline", Workflow],
                    ["calendar", "Calendar", CalendarDays],
                    ["timeline", "Timeline", ListFilter],
                  ] as const
                ).map(([type, label, Icon]) => (
                  <DropdownMenuItem
                    key={type}
                    className="cursor-pointer text-xs"
                    onSelect={async () => {
                      const viewId = await databaseState.createView({
                        dataSourceId: database.dataSource.id,
                        name: label,
                        type,
                      });
                      if (viewId) setSelectedViewId(viewId);
                    }}
                  >
                    <Icon className="mr-1.5 size-3.5" /> {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground/80 hover:text-foreground h-7 px-2 text-xs font-normal"
              onClick={() => setIsAddingProperty(true)}
            >
              <Plus className="size-3.5" /> Property
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-7 rounded-md bg-[#2383E2] px-2.5 text-xs font-medium text-white shadow-none hover:bg-[#1d73c9]"
                >
                  <Plus className="size-3.5" /> New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("dialogs.tableTemplates")}</DropdownMenuLabel>
                {databaseState.rowTemplates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onSelect={() =>
                      void createAndOpenRow(undefined, template.id)
                    }
                  >
                    {template.name}
                    {template.isDefault ? (
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        Default
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
                {databaseState.rowTemplates.length ? (
                  <DropdownMenuSeparator />
                ) : null}
                <DropdownMenuItem onSelect={() => void createAndOpenRow()}>
                  Blank
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {activeView?.type === "board" ? (
        <DatabaseBoard
          database={database}
          onSetValue={databaseState.setValue}
          onAddRow={(optionId) =>
            void createAndOpenRow(
              activeView?.groupPropertyId
                ? [
                    {
                      propertyId: activeView.groupPropertyId,
                      optionIds: optionId ? [optionId] : [],
                    },
                  ]
                : undefined,
            )
          }
          onOpenRow={setOpenRowId}
          onUpdateOption={databaseState.updateSelectOption}
          onRemoveOption={databaseState.removeSelectOption}
          onUpdateView={databaseState.updateView}
        />
      ) : activeView?.type === "calendar" ? (
        <DatabaseCalendar
          database={database}
          onSetValue={databaseState.setValue}
          onAddRow={(dateStart?: number) => {
            const dateProp =
              database.properties.find(
                (property) => property.id === activeView.datePropertyId,
              ) ??
              database.properties.find((property) => property.type === "date");
            void createAndOpenRow(
              dateProp && dateStart !== undefined
                ? [{ propertyId: dateProp.id, dateStart }]
                : undefined,
            );
          }}
          onOpenRow={setOpenRowId}
          readOnly={readOnly}
        />
      ) : activeView?.type === "timeline" ? (
        <DatabaseTimeline database={database} />
      ) : (
        <DatabaseGrid
          database={database}
          visibleProperties={visibleProperties}
          onSetValue={databaseState.setValue}
          onSetRelation={databaseState.setRelation}
          onAddSelectOption={databaseState.addSelectOption}
          onUpdateRowTitle={databaseState.updateRowTitle}
          onEditProperty={(property) => setEditingPropertyId(property.id)}
          onOpenRow={setOpenRowId}
          onDeleteRows={databaseState.deleteRows}
          readOnly={readOnly}
        />
      )}
      {!readOnly ? (
        <button
          type="button"
          className="text-muted-foreground/70 hover:text-foreground hover:bg-muted/30 mt-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          onClick={() => void createAndOpenRow()}
        >
          <Plus className="size-3.5" /> New page
        </button>
      ) : null}

      {!readOnly ? (
        <AddPropertyDialog
          open={isAddingProperty}
          onOpenChange={setIsAddingProperty}
          dataSourceId={database.dataSource.id}
          onAdd={(input) =>
            databaseState.addProperty({
              dataSourceId: database.dataSource.id,
              ...input,
            })
          }
        />
      ) : null}
      {!readOnly && editingProperty ? (
        <PropertySettingsDialog
          key={`${editingProperty.id}:${editingProperty.name}:${editingProperty.formulaExpression ?? ""}`}
          property={editingProperty}
          open
          onOpenChange={(open) => {
            if (!open) setEditingPropertyId(undefined);
          }}
          onSave={databaseState.updateProperty}
        />
      ) : null}
      {!readOnly && activeView ? (
        <ViewSettingsDialog
          key={`${activeView.id}:${activeView.filterJson ?? ""}:${activeView.sorts.length}`}
          open={isConfiguringView}
          onOpenChange={setIsConfiguringView}
          database={database}
          view={activeView}
          onSave={databaseState.updateView}
        />
      ) : null}
      {!readOnly ? (
        <DatabaseRowSidePeek
          database={database}
          rowId={openRowId}
          onClose={() => setOpenRowId(undefined)}
          onUpdateTitle={databaseState.updateRowTitle}
          onSetValue={databaseState.setValue}
          onAddSelectOption={databaseState.addSelectOption}
          onCreateTemplate={databaseState.createRowTemplate}
          onDeleteRows={databaseState.deleteRows}
        />
      ) : null}
    </div>
  );
}
