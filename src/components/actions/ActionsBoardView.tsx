"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterMeasureItems } from "@/lib/architecture-measures";
import { isActionsView } from "@/lib/storm-json";
import { useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";
import {
  ACTION_TYPES,
  OBLIGATION_LEVELS,
  type ActionType,
  type MeasureActionItem,
  type ObligationLevel,
} from "@/types/actions-view";
import { ActionCard } from "@/components/actions/ActionCard";
import { ActionDetailDock } from "@/components/actions/ActionDetailDock";
import { ActionFilters } from "@/components/actions/ActionFilters";

const DROP_CELL_ATTR = "data-measure-drop-cell";

type DragState = {
  itemId: string;
  pointerId: number;
};

function readDropTarget(clientX: number, clientY: number): {
  obligation: ObligationLevel;
  actionType: ActionType;
} | null {
  const hit = document.elementFromPoint(clientX, clientY);
  const cell = hit?.closest(`[${DROP_CELL_ATTR}]`);
  if (!cell) return null;
  const obligation = cell.getAttribute("data-obligation");
  const actionType = cell.getAttribute("data-action-type");
  if (!obligation || !actionType) return null;
  return {
    obligation: obligation as ObligationLevel,
    actionType: actionType as ActionType,
  };
}

export function ActionsBoardView({ viewId }: { viewId: string }) {
  const t = useT();
  const view = useStormBoardStore((s) => s.views.find((v) => v.id === viewId));
  const selectedMeasureId = useStormBoardStore((s) => s.selectedMeasureId);
  const selectMeasure = useStormBoardStore((s) => s.selectMeasure);
  const addMeasure = useStormBoardStore((s) => s.addMeasureActionItem);
  const updateMeasure = useStormBoardStore((s) => s.updateMeasureActionItem);
  const moveMeasure = useStormBoardStore((s) => s.moveMeasureActionItem);
  const updateConfig = useStormBoardStore((s) => s.updateActionsViewConfig);
  const propertiesPanelOpen = useStormBoardStore((s) => s.propertiesPanelOpen);

  const dragRef = useRef<DragState | null>(null);
  const dropHintRef = useRef<{
    obligation: ObligationLevel;
    actionType: ActionType;
  } | null>(null);
  const [dropHint, setDropHint] = useState<{
    obligation: ObligationLevel;
    actionType: ActionType;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const actionsView = view && isActionsView(view) ? view : null;

  const items = useMemo(
    () => (actionsView ? filterMeasureItems(actionsView.items, actionsView.config) : []),
    [actionsView],
  );

  const columns =
    actionsView?.config.groupBy === "actionType" ? ACTION_TYPES : OBLIGATION_LEVELS;
  const rows =
    actionsView?.config.groupBy === "actionType" ? OBLIGATION_LEVELS : ACTION_TYPES;

  const cellItems = useCallback(
    (col: string, row: string) => {
      if (!actionsView) return [];
      return items.filter((item) => {
        const obligation = actionsView.config.groupBy === "obligation" ? col : row;
        const actionType = actionsView.config.groupBy === "obligation" ? row : col;
        return item.obligation === obligation && item.actionType === actionType;
      });
    },
    [actionsView, items],
  );

  const setHint = useCallback(
    (hint: { obligation: ObligationLevel; actionType: ActionType } | null) => {
      dropHintRef.current = hint;
      setDropHint(hint);
    },
    [],
  );

  const beginDrag = useCallback((item: MeasureActionItem, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { itemId: item.id, pointerId: e.pointerId };
    setDraggingId(item.id);
    setHint(null);
  }, [setHint]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      setHint(readDropTarget(e.clientX, e.clientY));
    };

    const finishDrag = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const hint = dropHintRef.current;
      dragRef.current = null;
      setDraggingId(null);
      setHint(null);
      if (hint) {
        moveMeasure(viewId, drag.itemId, hint.obligation, hint.actionType);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [moveMeasure, setHint, viewId]);

  if (!actionsView) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        {t("actionsView.emptyBoard")}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--canvas)]">
      <ActionFilters
        config={actionsView.config}
        visibleCount={items.length}
        totalCount={actionsView.items.length}
        onConfigChange={(patch) => updateConfig(viewId, patch)}
        onAddMeasure={() =>
          addMeasure(viewId, { obligation: "Recommended", actionType: "IMPROVE" })
        }
      />
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `minmax(5rem, auto) repeat(${columns.length}, minmax(10rem, 1fr))`,
            }}
          >
            <div />
            {columns.map((col) => (
              <div
                key={col}
                className="sticky top-0 z-10 bg-[var(--canvas)] px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                {actionsView.config.groupBy === "obligation"
                  ? t(`actionsView.obligation.${col as ObligationLevel}`)
                  : t(`actionsView.actionType.${col as ActionType}`)}
              </div>
            ))}
            {rows.map((row) => (
              <div key={row} className="contents">
                <div className="flex items-center px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {actionsView.config.groupBy === "obligation"
                    ? t(`actionsView.actionType.${row as ActionType}`)
                    : t(`actionsView.obligation.${row as ObligationLevel}`)}
                </div>
                {columns.map((col) => {
                  const obligation =
                    actionsView.config.groupBy === "obligation"
                      ? (col as ObligationLevel)
                      : (row as ObligationLevel);
                  const actionType =
                    actionsView.config.groupBy === "obligation"
                      ? (row as ActionType)
                      : (col as ActionType);
                  const cell = cellItems(col, row);
                  const highlight =
                    dropHint?.obligation === obligation &&
                    dropHint?.actionType === actionType;
                  return (
                    <div
                      key={`${col}-${row}`}
                      {...{
                        [DROP_CELL_ATTR]: "",
                        "data-obligation": obligation,
                        "data-action-type": actionType,
                      }}
                      className={[
                        "min-h-[5rem] space-y-2 rounded-lg border border-dashed p-1.5 transition",
                        highlight
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--border)]/60 bg-[var(--surface)]/40",
                      ].join(" ")}
                    >
                      {cell.length === 0 ? (
                        <p className="pointer-events-none px-1 py-2 text-[10px] text-[var(--muted)] opacity-60">
                          —
                        </p>
                      ) : (
                        cell.map((item) => (
                          <ActionCard
                            key={item.id}
                            item={item}
                            selected={item.id === selectedMeasureId}
                            dragging={draggingId === item.id}
                            onSelect={() => {
                              if (dragRef.current) return;
                              selectMeasure(item.id);
                            }}
                            onTitleChange={(title) =>
                              updateMeasure(viewId, item.id, { title })
                            }
                            dragProps={{ onPointerDown: (e) => beginDrag(item, e) }}
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {actionsView.items.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              {t("actionsView.emptyBoard")}
            </p>
          ) : null}
        </div>
        {propertiesPanelOpen && selectedMeasureId ? (
          <div className="hidden w-[min(22rem,38%)] shrink-0 lg:flex">
            <ActionDetailDock viewId={viewId} itemId={selectedMeasureId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
