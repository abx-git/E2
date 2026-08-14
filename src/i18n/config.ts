/**
 * Supported UI locales. Default is German (current product language).
 * Preference is client-only (localStorage + optional `?lang=`), not URL prefixes —
 * that fits static GitHub Pages with `basePath` `/E2`.
 */

export const LOCALES = ["de", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";

/** localStorage key for the user’s language choice. */
export const LOCALE_STORAGE_KEY = "e2.locale";

/** Query param to force a locale once (then persisted). */
export const LOCALE_URL_PARAM = "lang";

/** BCP 47 tags for `Intl` / `toLocaleString` / `<html lang>`. */
export const LOCALE_BCP47: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
};

/** Native labels for the language switcher. */
export const LOCALE_NATIVE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "de" || value === "en";
}
