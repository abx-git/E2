import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALE_URL_PARAM,
  isLocale,
  type Locale,
} from "@/i18n/config";

/** Map `navigator.language` / `Accept-Language`-style tags to a supported locale. */
export function localeFromLanguageTag(tag: string | null | undefined): Locale | null {
  if (!tag?.trim()) return null;
  const primary = tag.trim().toLowerCase().split("-")[0];
  if (primary === "de") return "de";
  if (primary === "en") return "en";
  return null;
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)?.trim();
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function readLocaleFromSearch(search?: string): Locale | null {
  if (typeof window === "undefined" && search === undefined) return null;
  try {
    const raw =
      search ?? (typeof window !== "undefined" ? window.location.search : "");
    const value = new URLSearchParams(raw).get(LOCALE_URL_PARAM)?.trim().toLowerCase();
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Strip `?lang=` after applying it so bookmarks stay clean.
 * Preserves other query params.
 */
export function stripLocaleParamFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(LOCALE_URL_PARAM)) return;
    url.searchParams.delete(LOCALE_URL_PARAM);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", next);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve UI locale: `?lang=` → localStorage → navigator → default (`de`).
 */
export function resolveInitialLocale(opts?: {
  search?: string;
  stored?: Locale | null;
  navigatorLanguages?: readonly string[];
}): Locale {
  const fromUrl = readLocaleFromSearch(opts?.search);
  if (fromUrl) return fromUrl;

  const stored =
    opts?.stored !== undefined ? opts.stored : readStoredLocale();
  if (stored) return stored;

  const languages =
    opts?.navigatorLanguages ??
    (typeof navigator !== "undefined" ? navigator.languages : undefined) ??
    (typeof navigator !== "undefined" && navigator.language
      ? [navigator.language]
      : []);

  for (const tag of languages) {
    const matched = localeFromLanguageTag(tag);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}
