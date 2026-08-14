export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_BCP47,
  LOCALE_NATIVE_LABELS,
  LOCALE_STORAGE_KEY,
  LOCALE_URL_PARAM,
  isLocale,
  type Locale,
} from "@/i18n/config";

export type { MessageKey, MessageTree, MessageVars } from "@/i18n/types";

export {
  resolveInitialLocale,
  localeFromLanguageTag,
  readStoredLocale,
  writeStoredLocale,
  readLocaleFromSearch,
} from "@/i18n/resolve-locale";

export { createTranslator, translate } from "@/i18n/translate";

export {
  I18nProvider,
  useI18n,
  useT,
  useLocale,
  type I18nContextValue,
  type I18nProviderProps,
} from "@/i18n/provider";

export { LanguageSwitcher } from "@/i18n/language-switcher";
