import { DEFAULT_LOCALE, readStoredLocale, translate } from "@/i18n";
import type { MessageKey, MessageVars } from "@/i18n";

/** User-visible collab strings outside React (follows stored locale / browser default). */
export function collabT(key: MessageKey, vars?: MessageVars): string {
  return translate(readStoredLocale() ?? DEFAULT_LOCALE, key, vars);
}
