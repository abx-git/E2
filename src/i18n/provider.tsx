"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALE_NATIVE_LABELS,
  LOCALES,
  type Locale,
} from "@/i18n/config";
import {
  resolveInitialLocale,
  stripLocaleParamFromUrl,
  writeStoredLocale,
} from "@/i18n/resolve-locale";
import { createTranslator, type TranslateFn } from "@/i18n/translate";

export interface I18nContextValue {
  locale: Locale;
  bcp47: string;
  locales: readonly Locale[];
  localeLabels: Record<Locale, string>;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  /** Override for tests / storybook. */
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
  const [ready, setReady] = useState(Boolean(initialLocale));

  useEffect(() => {
    if (initialLocale) {
      setLocaleState(initialLocale);
      setReady(true);
      return;
    }
    const resolved = resolveInitialLocale();
    setLocaleState(resolved);
    writeStoredLocale(resolved);
    if (readHasLangParam()) {
      stripLocaleParamFromUrl();
    }
    setReady(true);
  }, [initialLocale]);

  useEffect(() => {
    if (!ready) return;
    try {
      document.documentElement.lang = LOCALE_BCP47[locale];
    } catch {
      /* ignore */
    }
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      bcp47: LOCALE_BCP47[locale],
      locales: LOCALES,
      localeLabels: LOCALE_NATIVE_LABELS,
      t,
      setLocale,
    }),
    [locale, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function readHasLangParam(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("lang");
  } catch {
    return false;
  }
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}

/** Shortcut: only the translator. */
export function useT(): TranslateFn {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
