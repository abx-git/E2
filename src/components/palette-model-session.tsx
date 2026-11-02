"use client";

import { getFacilitatorFormatsForMode } from "@/lib/facilitator-phases";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ModelingMode, WorkshopFormat } from "@/types/storm-element";
import { MODELING_MODES } from "@/types/storm-element";
import { modelingModeLabel, useT, workshopFormatLabel } from "@/i18n";
import type { TranslateFn } from "@/i18n/translate";

function formatOptionsForMode(
  t: TranslateFn,
  mode: ModelingMode,
): { value: WorkshopFormat; label: string }[] {
  return [
    { value: "free", label: workshopFormatLabel(t, "free") },
    ...getFacilitatorFormatsForMode(mode).map((f) => ({
      value: f.format,
      label: workshopFormatLabel(t, f.format),
    })),
  ];
}

/** Modeling mode + workshop session controls for the element palette. */
export function PaletteModelSessionControls() {
  const t = useT();
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const setModelingMode = useStormBoardStore((s) => s.setModelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const setWorkshopFormat = useStormBoardStore((s) => s.setWorkshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const setFacilitatorEnabled = useStormBoardStore((s) => s.setFacilitatorEnabled);
  const workshopMode = useStormBoardStore((s) => s.workshopMode);
  const setWorkshopMode = useStormBoardStore((s) => s.setWorkshopMode);

  const formatOptions = formatOptionsForMode(t, modelingMode);

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--border)] pt-2">
      <label className="flex flex-col gap-0.5">
        <span className="text-[0.55rem] font-medium uppercase tracking-wide text-[var(--muted)]">
          {t("appBar.modelingMode")}
        </span>
        <select
          className="dock-field w-full py-1 text-[0.68rem]"
          value={modelingMode}
          onChange={(e) => setModelingMode(e.target.value as ModelingMode)}
          aria-label={t("appBar.modelingMode")}
        >
          {MODELING_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {modelingModeLabel(t, mode)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[0.55rem] font-medium uppercase tracking-wide text-[var(--muted)]">
          {t("appBar.session")}
        </span>
        <select
          className="dock-field w-full py-1 text-[0.68rem]"
          value={workshopFormat}
          onChange={(e) => setWorkshopFormat(e.target.value as WorkshopFormat)}
          aria-label={t("appBar.sessionFormat")}
        >
          {formatOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-[0.62rem] leading-snug text-[var(--text)]">
        <input
          type="checkbox"
          className="shrink-0"
          checked={facilitatorEnabled}
          disabled={workshopFormat === "free"}
          onChange={(e) => setFacilitatorEnabled(e.target.checked)}
        />
        {t("appBar.facilitatorPhases")}
      </label>
      <label
        className="flex cursor-pointer items-center gap-1.5 text-[0.62rem] leading-snug text-[var(--text)]"
        title={t("appBar.syncActiveTabTitle")}
      >
        <input
          type="checkbox"
          className="shrink-0"
          checked={workshopMode}
          onChange={(e) => setWorkshopMode(e.target.checked)}
        />
        {t("appBar.syncActiveTabShort")}
      </label>
    </div>
  );
}
