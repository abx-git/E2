"use client";

import { useMemo, useState } from "react";
import { EyeOff, Flame, Link2, Plus, RotateCcw } from "lucide-react";
import {
  collectBoardHotspots,
  findMeasureForHotspot,
  hotspotRefKey,
  partitionHotspotsForMeasuresView,
  type BoardHotspotRef,
} from "@/lib/board-hotspots";
import { useT } from "@/i18n";
import {
  boardImportPayloadFromStore,
  useStormBoardStore,
} from "@/store/storm-board-store";
import type { ActionsViewConfig, MeasureActionItem } from "@/types/actions-view";

export function ActionHotspotsPanel({
  actionsViewId,
  config,
  measureItems,
  onConfigChange,
}: {
  actionsViewId: string;
  config: ActionsViewConfig;
  measureItems: MeasureActionItem[];
  onConfigChange: (patch: Partial<ActionsViewConfig>) => void;
}) {
  const t = useT();
  const views = useStormBoardStore((s) => s.views);
  const elements = useStormBoardStore((s) => s.elements);
  const addFromHotspot = useStormBoardStore((s) => s.addMeasureFromHotspot);
  const navigateTarget = useStormBoardStore((s) => s.navigateToMeasureTarget);
  const selectMeasure = useStormBoardStore((s) => s.selectMeasure);
  const [showExcluded, setShowExcluded] = useState(false);

  const allHotspots = useMemo(
    () => collectBoardHotspots(boardImportPayloadFromStore()),
    [views, elements],
  );

  const { active, excluded } = partitionHotspotsForMeasuresView(
    allHotspots,
    config.excludedHotspotRefs,
  );

  if (allHotspots.length === 0) return null;

  const setExcluded = (h: BoardHotspotRef, excludedFromMeasures: boolean) => {
    const key = hotspotRefKey(h.viewId, h.elementId);
    const current = config.excludedHotspotRefs ?? [];
    const next = excludedFromMeasures
      ? Array.from(new Set([...current, key]))
      : current.filter((k) => k !== key);
    onConfigChange({
      excludedHotspotRefs: next.length ? next : undefined,
    });
  };

  const renderRow = (h: BoardHotspotRef, isExcludedList: boolean) => {
    const linked = findMeasureForHotspot(measureItems, h.viewId, h.elementId);
    return (
      <li
        key={hotspotRefKey(h.viewId, h.elementId)}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-[var(--control)]/40"
      >
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-xs"
          title={t("actionsView.hotspots.openOnCanvas", {
            view: h.viewName,
            label: h.label,
          })}
          onClick={() => navigateTarget(h.viewId, h.elementId)}
        >
          <span className="text-[var(--muted)]">[{h.viewName}]</span>{" "}
          <span
            className={
              h.status === "resolved"
                ? "text-[var(--muted)] line-through"
                : "text-[#f0a8a0]"
            }
          >
            {h.label}
          </span>
          {h.priority === "high" ? (
            <span className="ml-0.5 font-bold text-[var(--accent-2)]">!</span>
          ) : null}
        </button>
        {linked ? (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--accent-2)]"
            title={t("actionsView.hotspots.openMeasure")}
            onClick={() => selectMeasure(linked.id)}
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        ) : !isExcludedList ? (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[var(--accent)]"
            title={t("actionsView.hotspots.adoptAsMeasure")}
            onClick={() => addFromHotspot(actionsViewId, h)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[var(--text)]"
          title={
            isExcludedList
              ? t("actionsView.hotspots.restoreToBacklog")
              : t("actionsView.hotspots.excludeFromBacklog")
          }
          onClick={() => setExcluded(h, !isExcludedList)}
        >
          {isExcludedList ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      </li>
    );
  };

  return (
    <section className="border-b border-[var(--border)] px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Flame className="h-3.5 w-3.5 text-[var(--accent-2)]" aria-hidden />
        <h3 className="text-xs font-semibold text-[var(--text)]">
          {t("actionsView.hotspots.title")}
        </h3>
        <span className="text-[10px] text-[var(--muted)]">
          {active.length}/{allHotspots.length}
        </span>
      </div>
      <p className="mb-2 text-[10px] leading-snug text-[var(--muted)]">
        {t("actionsView.hotspots.hint")}
      </p>
      {active.length > 0 ? (
        <ul className="max-h-32 space-y-0.5 overflow-y-auto">{active.map((h) => renderRow(h, false))}</ul>
      ) : (
        <p className="text-[10px] text-[var(--muted)]">{t("actionsView.hotspots.backlogEmpty")}</p>
      )}
      {excluded.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            className="text-[10px] text-[var(--muted)] underline"
            onClick={() => setShowExcluded((v) => !v)}
          >
            {showExcluded
              ? t("actionsView.hotspots.hideExcluded")
              : t("actionsView.hotspots.showExcluded", { count: excluded.length })}
          </button>
          {showExcluded ? (
            <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
              {excluded.map((h) => renderRow(h, true))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
