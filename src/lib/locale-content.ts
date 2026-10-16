import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

/** Pick localized static content with German fallback. */
export function pickLocaleContent<T>(locale: Locale, de: T, en: T): T {
  if (locale === "en") return en;
  return de;
}

export function resolveContentLocale(locale?: Locale | null): Locale {
  return locale ?? DEFAULT_LOCALE;
}
