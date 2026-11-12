"use client";

import { useCallback } from "react";

import { LOCALE_NATIVE_LABELS, type Locale } from "@/i18n/config";
import { flushActiveViewIntoViews } from "@/lib/board-views";
import { countRemappablePlaceholderLabelsInViews } from "@/lib/element-label-locale-migrate";
import { useI18n } from "@/i18n/provider";
import { useStormBoardStore } from "@/store/storm-board-store";

export interface LocaleLanguageControlProps {
  className?: string;
  id?: string;
}

/** Language select with optional remap of factory-default sticky titles. */
export function LocaleLanguageControl({ className, id = "e2-language" }: LocaleLanguageControlProps) {
  const { locale, locales, localeLabels, setLocale, t } = useI18n();
  const remapPlaceholderLabelsToLocale = useStormBoardStore((s) => s.remapPlaceholderLabelsToLocale);

  const applyLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      const state = useStormBoardStore.getState();
      const views = flushActiveViewIntoViews(state);
      const count = countRemappablePlaceholderLabelsInViews(views, next);
      if (
        count > 0 &&
        typeof window !== "undefined" &&
        window.confirm(
          t("language.remapLabelsConfirm", {
            count: String(count),
            locale: LOCALE_NATIVE_LABELS[next],
          }),
        )
      ) {
        setLocale(next);
        remapPlaceholderLabelsToLocale(next);
        return;
      }
      setLocale(next);
    },
    [locale, remapPlaceholderLabelsToLocale, setLocale, t],
  );

  const runManualRemap = useCallback(() => {
    const updated = remapPlaceholderLabelsToLocale(locale);
    if (typeof window === "undefined") return;
    window.alert(
      updated > 0
        ? t("language.remapLabelsDone", { count: String(updated) })
        : t("language.remapLabelsNone"),
    );
  }, [locale, remapPlaceholderLabelsToLocale, t]);

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--text)]">
        <span className="text-[var(--muted)]">{t("language.label")}</span>
        <select
          id={id}
          className="dock-field"
          value={locale}
          onChange={(e) => applyLocale(e.target.value as Locale)}
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
      <div className="space-y-1 border-t border-[var(--border)] pt-2">
        <button type="button" className="dock-control w-full rounded-lg px-2.5 py-1.5 text-xs" onClick={runManualRemap}>
          {t("language.remapLabelsButton")}
        </button>
        <p className="text-[0.65rem] leading-snug text-[var(--muted)]">{t("language.remapLabelsHint")}</p>
      </div>
    </div>
  );
}
