"use client";

import { ClipboardList, EyeOff, Link2, Plus, RotateCcw } from "lucide-react";
import {
  findMeasureForHotspotInBoard,
  isHotspotExcludedFromMeasures,
} from "@/lib/board-hotspots";
import { listActionsViews, resolveDefaultActionsViewId } from "@/lib/measure-hotspot-ui";
import { isActionsView } from "@/lib/storm-json";
import { HintInfoButton } from "@/components/hint-info-button";
import { useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { StormElement } from "@/types/storm-element";

export function HotspotMeasuresActions({
  element,
  compact = false,
}: {
  element: StormElement;
  compact?: boolean;
}) {
  const t = useT();
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const addFromHotspot = useStormBoardStore((s) => s.addMeasureFromHotspot);
  const setBacklogHidden = useStormBoardStore((s) => s.setHotspotMeasuresBacklogHidden);
  const setActiveView = useStormBoardStore((s) => s.setActiveView);
  const selectMeasure = useStormBoardStore((s) => s.selectMeasure);
  const actionsViewId = resolveDefaultActionsViewId(views, activeViewId);
  const actionsViews = listActionsViews(views);
  const canvasView = views.find((v) => v.id === activeViewId);
  const viewName = canvasView?.name ?? "Board";

  if (!actionsViewId || element.type !== "hotspot") return null;

  const actionsView = views.find((v) => v.id === actionsViewId);
  const config = actionsView && isActionsView(actionsView) ? actionsView.config : undefined;
  const linked = findMeasureForHotspotInBoard(views, activeViewId, element.id);
  const hidden = config
    ? isHotspotExcludedFromMeasures(config, activeViewId, element.id)
    : false;

  const hotspotRef = {
    viewId: activeViewId,
    viewName,
    elementId: element.id,
    label: element.label?.trim() || element.id,
    description: element.description?.trim() || undefined,
    status: element.metadata?.hotspotStatus ?? ("open" as const),
    priority: element.metadata?.hotspotPriority ?? ("medium" as const),
  };

  const btnClass = compact
    ? "dock-control flex w-full items-center justify-start gap-1.5 rounded-md px-2 py-1.5 text-xs"
    : "dock-control flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium";

  return (
    <div className={compact ? "space-y-1" : "space-y-2 border-t border-[var(--border)] pt-3"}>
      {!compact ? (
        <div className="flex items-center gap-1">
          <p className="text-[0.72rem] font-medium text-[var(--muted)]">
            {t("actionsView.hotspots.canvasSection")}
          </p>
          <HintInfoButton ariaLabel={t("actionsView.hotspots.infoAria")}>
            <p>{t("actionsView.hotspots.hint")}</p>
            {actionsViews.length > 1 ? (
              <p className="mt-1.5 border-t border-[var(--border)] pt-1.5">
                {t("actionsView.hotspots.targetView", {
                  name: actionsView?.name ?? "",
                })}
              </p>
            ) : null}
          </HintInfoButton>
        </div>
      ) : null}
      {linked ? (
        <button
          type="button"
          className={btnClass}
          onClick={() => {
            setActiveView(linked.actionsViewId);
            selectMeasure(linked.item.id);
          }}
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          {linked.item.title || t("actionsView.hotspots.openMeasure")}
        </button>
      ) : (
        <button
          type="button"
          className={btnClass}
          onClick={() => addFromHotspot(actionsViewId, hotspotRef)}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {t("actionsView.hotspots.adoptAsMeasure")}
        </button>
      )}
      <button
        type="button"
        className={btnClass}
        onClick={() =>
          setBacklogHidden(actionsViewId, activeViewId, element.id, !hidden)
        }
      >
        {hidden ? (
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 shrink-0" />
        )}
        {hidden
          ? t("actionsView.hotspots.restoreToBacklog")
          : t("actionsView.hotspots.excludeFromBacklog")}
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={() => setActiveView(actionsViewId)}
      >
        <ClipboardList className="h-3.5 w-3.5 shrink-0" />
        {t("actionsView.hotspots.openMeasuresView")}
      </button>
    </div>
  );
}
