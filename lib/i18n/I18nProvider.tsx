"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { en, type LocalizedDictionary } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";
import { fr } from "./dictionaries/fr";
import { es } from "./dictionaries/es";
import {
  getPath,
  getStoredLocale,
  interpolate,
  resolveLocale,
  storeLocale,
  type Locale,
  type LocaleSetting,
  type TranslationKey,
} from "./index";

const dictionaries: Record<Locale, LocalizedDictionary> = { en, ar, fr, es };

const STORAGE_EVENT = "nexfiy-language-change";

const emptySubscribe = () => () => {};

const subscribeToLanguageChanges = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
};

const getLanguageSnapshot = () => getStoredLocale();
const getLanguageServerSnapshot = (): LocaleSetting => "system";

interface I18nContextValue {
  locale: LocaleSetting;
  resolvedLocale: Locale;
  isMounted: boolean;
  setLocale: (locale: LocaleSetting) => void;
  t: (
    key: TranslationKey,
    values?: Record<string, string>,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const locale = useSyncExternalStore(
    subscribeToLanguageChanges,
    getLanguageSnapshot,
    getLanguageServerSnapshot,
  );

  const setLocale = useCallback((next: LocaleSetting) => {
    storeLocale(next);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  const resolvedLocale = resolveLocale(locale);
  const dictionary = dictionaries[resolvedLocale];

  useEffect(() => {
    const root = document.documentElement;
    root.lang = resolvedLocale;
    root.dir = resolvedLocale === "ar" ? "rtl" : "ltr";
  }, [resolvedLocale]);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string>) => {
      const template =
        getPath(dictionary as unknown as Record<string, unknown>, key) ??
        getPath(en as unknown as Record<string, unknown>, key) ??
        key;
      return interpolate(template, values);
    },
    [dictionary],
  );

  const value = useMemo(
    () => ({ locale, resolvedLocale, isMounted, setLocale, t }),
    [locale, resolvedLocale, isMounted, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
