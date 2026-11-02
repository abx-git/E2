"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { getFacilitatorFormatsForMode } from "@/lib/facilitator-phases";
import {
  readPaletteSetupExpanded,
  writePaletteSetupExpanded,
} from "@/lib/board-layout-prefs";
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

function sessionSummaryLabel(
  t: TranslateFn,
  workshopFormat: WorkshopFormat,
  facilitatorEnabled: boolean,
  formatOptions: { value: WorkshopFormat; label: string }[],
): string {
  if (workshopFormat === "free") return workshopFormatLabel(t, "free");
  if (facilitatorEnabled) return t("appBar.facilitator");
  return formatOptions.find((o) => o.value === workshopFormat)?.label ?? t("appBar.workshop");
}

function ModelSessionFields() {
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
    <div className="flex flex-col gap-1.5 pt-1.5">
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

/** Collapsed chip + expandable setup for modeling mode and session. */
export function PaletteModelSessionControls() {
  const t = useT();
  const panelId = useId();
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const workshopMode = useStormBoardStore((s) => s.workshopMode);

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(readPaletteSetupExpanded());
  }, []);

  const formatOptions = formatOptionsForMode(t, modelingMode);
  const modeLabel = modelingModeLabel(t, modelingMode);
  const sessionLabel = sessionSummaryLabel(
    t,
    workshopFormat,
    facilitatorEnabled,
    formatOptions,
  );
  const setupActive = facilitatorEnabled || workshopMode;

  const onToggle = (next: boolean) => {
    setExpanded(next);
    writePaletteSetupExpanded(next);
  };

  return (
    <details className="group mt-1.5 min-w-0" open={expanded}>
      <summary
        className={[
          "flex cursor-pointer list-none items-center gap-1 rounded-md px-1 py-1 transition",
          "hover:bg-[var(--control-hover)]",
          "[&::-webkit-details-marker]:hidden",
          expanded ? "dock-control-active" : "text-[var(--text)]",
        ].join(" ")}
        aria-controls={panelId}
        aria-expanded={expanded}
        title={t("panels.modelSessionExpandHint")}
        onClick={(e) => {
          e.preventDefault();
          onToggle(!expanded);
        }}
      >
        <SlidersHorizontal className="h-3 w-3 shrink-0 text-[var(--muted)]" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[0.62rem] font-medium leading-tight">
          {modeLabel}
          <span className="font-normal text-[var(--muted)]"> · </span>
          {sessionLabel}
        </span>
        {setupActive ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]"
            title={t("panels.modelSessionOptionsActive")}
            aria-hidden
          />
        ) : null}
        <ChevronDown
          className="h-3 w-3 shrink-0 text-[var(--muted)] transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div id={panelId} className="rounded-md bg-[var(--control)]/40 px-1 pb-1">
        <ModelSessionFields />
      </div>
    </details>
  );
}
