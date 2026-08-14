import type { Locale } from "@/i18n/config";
import type { MessageTree } from "@/i18n/types";
import { de } from "@/i18n/messages/de";
import { en } from "@/i18n/messages/en";

export const catalogs: Record<Locale, MessageTree> = {
  de,
  en,
};

export { de, en };
