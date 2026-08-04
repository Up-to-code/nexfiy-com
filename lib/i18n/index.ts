import { en } from "./dictionaries/en";

export type Locale = "en" | "ar";
export type LocaleSetting = "system" | Locale;

export const SUPPORTED_LOCALES: Locale[] = ["en", "ar"];

export const LANGUAGE_STORAGE_KEY = "nexfiy-language";

type Primitive = string | number | boolean;

export type DeepPaths<T> = T extends Primitive | readonly Primitive[]
  ? never
  : {
      [K in Extract<keyof T, string>]: T[K] extends readonly unknown[]
        ? `${K}`
        : T[K] extends Primitive
          ? `${K}`
          : `${K}` | `${K}.${DeepPaths<T[K]>}`;
    }[Extract<keyof T, string>];

export type TranslationKey = DeepPaths<typeof en>;

export function detectSystemLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const language = navigator.language?.toLowerCase() ?? "";
  return language.startsWith("ar") ? "ar" : "en";
}

export function resolveLocale(setting: LocaleSetting): Locale {
  return setting === "system" ? detectSystemLocale() : setting;
}

export function getStoredLocale(): LocaleSetting {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "ar" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore storage access errors
  }
  return "system";
}

export function storeLocale(setting: LocaleSetting) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, setting);
  } catch {
    // ignore storage access errors
  }
}

export function getPath(
  source: Record<string, unknown>,
  path: string,
): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>((acc, part) => {
      if (acc === null || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[part];
    }, source);
  return typeof value === "string" ? value : undefined;
}

export function interpolate(template: string, values?: Record<string, string>) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    values[name] !== undefined ? values[name] : `{${name}}`,
  );
}
