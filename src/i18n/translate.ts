import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { catalogs } from "@/i18n/messages";
import { getMessageByPath, interpolate } from "@/i18n/path";
import type { MessageKey, MessageVars } from "@/i18n/types";

export type TranslateFn = (key: MessageKey, vars?: MessageVars) => string;

/**
 * Build a translator for `locale`. Missing keys fall back to German, then the key itself.
 */
export function createTranslator(locale: Locale): TranslateFn {
  const primary = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  const fallback = catalogs[DEFAULT_LOCALE];

  return (key, vars) => {
    const raw =
      getMessageByPath(primary, key) ??
      (locale !== DEFAULT_LOCALE ? getMessageByPath(fallback, key) : undefined) ??
      key;
    return interpolate(raw, vars);
  };
}

/** One-shot translate outside React (e.g. document.title, alerts). */
export function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  return createTranslator(locale)(key, vars);
}
