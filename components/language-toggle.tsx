"use client";

import {
  Check,
  ChevronsUpDown,
  Globe,
  Languages,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { LocaleSetting } from "@/lib/i18n";

interface LanguageToggleProps {
  variant?: "icon" | "select";
  align?: "start" | "center" | "end";
}

export function LanguageToggle({
  variant = "icon",
  align = "end",
}: LanguageToggleProps) {
  const { locale, resolvedLocale, t, setLocale } = useI18n();

  const options: {
    value: LocaleSetting;
    label: string;
    hint?: string;
  }[] = [
    { value: "system", label: t("language.system"), hint: t("language.systemHint") },
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
  ];

  const current =
    options.find((option) => option.value === locale) ??
    options.find((option) => option.value === "system")!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "select" ? (
          <button
            type="button"
            aria-label={t("language.label")}
            className={cn(
              "bg-background/50 border-border/80 focus:ring-primary/50 flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2 text-xs font-normal focus:ring-1",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Globe className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">{current.label}</span>
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3 shrink-0" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("language.label")}
            className="rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-white/80 dark:hover:bg-white/10"
          >
            <Globe className="size-4.5" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="bg-popover text-popover-foreground border-border w-56 rounded-xl border p-1.5 shadow-xl"
      >
        <DropdownMenuLabel className="text-muted-foreground px-2.5 py-1.5 text-xs font-semibold">
          {t("language.label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60 my-1" />
        {options.map((option) => {
          const isActive = option.value === locale;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setLocale(option.value)}
              className="cursor-pointer"
            >
              <Languages
                className={cn(
                  "text-muted-foreground size-4",
                  isActive && "text-primary",
                )}
              />
              <span className="flex flex-1 items-center justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.hint && (
                    <span className="text-muted-foreground text-[11px]">
                      {option.hint}
                    </span>
                  )}
                </span>
                {isActive && <Check className="text-primary size-4" />}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
