"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

import { INSERTABLE_BLOCKS, type PageBlockType } from "./registry";

export type BlockCommandAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function BlockCommandMenu({
  open,
  onOpenChange,
  onSelect,
  anchor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: PageBlockType) => void;
  anchor?: BlockCommandAnchor;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed"
          style={{
            left: anchor?.left ?? 0,
            top: anchor?.top ?? 0,
            width: anchor?.width ?? 1,
            height: anchor?.height ?? 1,
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden p-0 shadow-xl"
      >
        <Command className="**:[[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput placeholder="Search blocks…" autoFocus />
          <CommandList className="max-h-96">
            <CommandEmpty>No matching blocks.</CommandEmpty>
            <CommandGroup heading="Building blocks">
              {INSERTABLE_BLOCKS.map((definition) => {
                const Icon = definition.icon;
                return (
                  <CommandItem
                    key={definition.type}
                    value={`${definition.label} ${definition.description} ${definition.type}`}
                    onSelect={() => onSelect(definition.type)}
                    className="items-start gap-3 py-2.5"
                  >
                    <Icon className="mt-0.5 size-4" />
                    <span>
                      <span className="block text-sm">{definition.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {definition.description}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
