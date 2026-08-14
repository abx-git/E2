"use client";

import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

export interface LanguageSwitcherProps {
  /** Compact select only (default). */
  className?: string;
  id?: string;
}

/** Language control for Appearance / settings. */
export function LanguageSwitcher({ className, id = "e2-language" }: LanguageSwitcherProps) {
  const { locale, locales, localeLabels, setLocale, t } = useI18n();

  return (
    <label
      className={["flex min-w-0 flex-col gap-1 text-xs text-[var(--text)]", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-[var(--muted)]">{t("language.label")}</span>
      <select
        id={id}
        className="dock-field"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-describedby={`${id}-hint`}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
      <span id={`${id}-hint`} className="text-[0.65rem] text-[var(--muted)]">
        {t("language.hint")}
      </span>
    </label>
  );
}
