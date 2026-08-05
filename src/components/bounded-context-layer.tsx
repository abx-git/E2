"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Lock } from "lucide-react";

import { resolveBoundedContextViewNavigation } from "@/lib/bounded-context-view";
import { cssRegionStackingZIndex, sortByZOrder } from "@/lib/element-z-order";
import { expandCanvasMoveSet, selectionItemCount } from "@/lib/selection-move";
import { resolveRegionPaint } from "@/lib/region-style";
import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_SIZE = 80;
const DEFAULT_LABEL = "Bounded Context";
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLE_POSITIONS: Record<ResizeHandle, string> = {
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
};

export function BoundedContextLayer() {
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const selectedBoundedContextIds = useStormBoardStore((s) => s.selectedBoundedContextIds);
  const selectBoundedContext = useStormBoardStore((s) => s.selectBoundedContext);
  const updateBoundedContext = useStormBoardStore((s) => s.updateBoundedContext);
  const navigateBoundedContextViewLink = useStormBoardStore((s) => s.navigateBoundedContextViewLink);
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const relationMode = useStormBoardStore((s) => s.relationMode);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const contextMapDraftSourceId = useStormBoardStore((s) => s.contextMapDraftSourceId);
  const connectMode = relationMode || contextMapMode;
  const ordered = sortByZOrder(boundedContexts);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const editingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const setDraftValue = (value: string) => {
    draftRef.current = value;
    setDraft(value);
  };

  const beginEdit = (bcId: string, label: string) => {
    selectBoundedContext(bcId);
    setDraftValue(label);
    editingRef.current = true;
    setEditingId(bcId);
  };

  const commitLabel = (bcId: string, value: string) => {
    if (!editingRef.current || editingId !== bcId) return;
    editingRef.current = false;
    setEditingId(null);
    const next = value.trim() || DEFAULT_LABEL;
    const bc = useStormBoardStore.getState().boundedContexts.find((b) => b.id === bcId);
    if (bc && next !== bc.label) {
      updateBoundedContext(bcId, { label: next });
    }
  };

  const cancelEdit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditingId(null);
  };

  useEffect(() => {
    if (!editingId) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editingId]);

  useEffect(() => {
    if (editingId && !selectedBoundedContextIds.includes(editingId) && editingRef.current) {
      commitLabel(editingId, draftRef.current);
    }
  }, [selectedBoundedContextIds, editingId]);

  const startMove = (bcId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (editingId === bcId) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    const store = useStormBoardStore.getState();
    // One "Verbinden"-tool: elements use relations, BCs use context-map links.
    if (store.relationMode || store.contextMapMode) {
      store.setRelationDraftSource(null);
      if (store.contextMapDraftSourceId && store.contextMapDraftSourceId !== bcId) {
        store.connectBoundedContexts(store.contextMapDraftSourceId, bcId);
        store.setContextMapDraftSource(null);
      } else {
        store.setContextMapDraftSource(bcId);
        selectBoundedContext(bcId);
      }
      return;
    }

    const alreadySelected = store.selectedBoundedContextIds.includes(bcId);
    const multiSelected =
      alreadySelected &&
      selectionItemCount({
        elementIds: store.selectedElementIds,
        swimlaneIds: store.selectedSwimlaneIds,
        boundedContextIds: store.selectedBoundedContextIds,
      }) > 1;

    if (!alreadySelected) {
      selectBoundedContext(bcId);
    }

    const current = useStormBoardStore.getState().boundedContexts.find((b) => b.id === bcId);
    if (!current || current.locked) return;

    const isTouch = e.pointerType === "touch";
    const startX = e.clientX;
    const startY = e.clientY;
    let longPressTriggered = false;
    let moveActive = false;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    const beginDragMove = () => {
      if (moveActive || longPressTriggered) return;
      const liveStore = useStormBoardStore.getState();
      const live = liveStore.boundedContexts.find((b) => b.id === bcId);
      if (!live || live.locked) return;
      moveActive = true;
      liveStore.beginGesture();

      const baseSelection = multiSelected
        ? {
            elementIds: liveStore.selectedElementIds,
            swimlaneIds: liveStore.selectedSwimlaneIds,
            boundedContextIds: liveStore.selectedBoundedContextIds,
          }
        : {
            elementIds: [] as string[],
            swimlaneIds: [] as string[],
            boundedContextIds: [bcId],
          };
      const moveSet = expandCanvasMoveSet(
        liveStore.elements,
        liveStore.swimlanes,
        liveStore.boundedContexts,
        baseSelection,
      );

      const elementOrigins = new Map(
        liveStore.elements
          .filter((el) => moveSet.elementIds.includes(el.id))
          .map((el) => [el.id, { x: el.x, y: el.y }] as const),
      );
      const swimlaneOrigins = new Map(
        liveStore.swimlanes
          .filter((l) => moveSet.swimlaneIds.includes(l.id) && !l.locked)
          .map((l) => [l.id, { x: l.x ?? 0, y: l.y }] as const),
      );
      const bcOrigins = new Map(
        liveStore.boundedContexts
          .filter((bc) => moveSet.boundedContextIds.includes(bc.id) && !bc.locked)
          .map((bc) => [bc.id, { x: bc.x, y: bc.y }] as const),
      );

      const onDragMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;
        useStormBoardStore.getState().moveCanvasSelection({
          elements: Array.from(elementOrigins.entries()).map(([id, orig]) => ({
            id,
            x: orig.x + dx,
            y: orig.y + dy,
          })),
          swimlanes: Array.from(swimlaneOrigins.entries()).map(([id, orig]) => ({
            id,
            x: orig.x + dx,
            y: orig.y + dy,
          })),
          boundedContexts: Array.from(bcOrigins.entries()).map(([id, orig]) => ({
            id,
            x: orig.x + dx,
            y: orig.y + dy,
          })),
        });
      };

      const onDragUp = () => {
        window.removeEventListener("pointermove", onDragMove);
        window.removeEventListener("pointerup", onDragUp);
        useStormBoardStore.getState().endGesture();
      };

      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragUp);
    };

    const clearLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    if (isTouch) {
      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        const current = useStormBoardStore.getState();
        if (!current.selectedBoundedContextIds.includes(bcId)) {
          current.selectBoundedContext(bcId);
        }
        current.openContextMenu(startX, startY, { kind: "boundedContext", id: bcId });
      }, LONG_PRESS_MS);
    } else {
      beginDragMove();
    }

    const onMove = (ev: PointerEvent) => {
      if (longPressTriggered) return;
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (longPressTimer && dist > LONG_PRESS_MOVE_CANCEL_PX) {
        clearLongPress();
        beginDragMove();
      }
    };

    const onUp = () => {
      clearLongPress();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    if (isTouch) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
  };

  const startResize = (bcId: string, handle: ResizeHandle, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const bc = useStormBoardStore.getState().boundedContexts.find((b) => b.id === bcId);
    if (!bc || bc.locked) return;
    e.stopPropagation();
    e.preventDefault();
    selectBoundedContext(bcId);
    useStormBoardStore.getState().beginGesture();

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: bc.x, y: bc.y, width: bc.width, height: bc.height };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;

      let x = orig.x;
      let y = orig.y;
      let width = orig.width;
      let height = orig.height;

      if (handle.includes("e")) width = Math.max(MIN_SIZE, orig.width + dx);
      if (handle.includes("s")) height = Math.max(MIN_SIZE, orig.height + dy);
      if (handle.includes("w")) {
        const nextWidth = Math.max(MIN_SIZE, orig.width - dx);
        x = orig.x + (orig.width - nextWidth);
        width = nextWidth;
      }
      if (handle.includes("n")) {
        const nextHeight = Math.max(MIN_SIZE, orig.height - dy);
        y = orig.y + (orig.height - nextHeight);
        height = nextHeight;
      }

      updateBoundedContext(bcId, { x, y, width, height });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      useStormBoardStore.getState().endGesture();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      {ordered.map((bc) => {
        const selected = selectedBoundedContextIds.includes(bc.id);
        const draftSource = contextMapDraftSourceId === bc.id;
        const editing = editingId === bc.id;
        const viewNav = resolveBoundedContextViewNavigation(bc, activeViewId, views);
        const paint = resolveRegionPaint("boundedContext", bc);
        return (
          <div
            key={bc.id}
            className={[
              "absolute rounded-lg border-2 touch-manipulation",
              selected || draftSource || editing ? "ring-2 ring-blue-300" : "",
              draftSource ? "ring-[#e9c46a]" : "",
              connectMode
                ? "cursor-crosshair"
                : paint.locked || editing
                  ? "cursor-default"
                  : "cursor-move",
            ].join(" ")}
            style={{
              left: bc.x,
              top: bc.y,
              width: bc.width,
              height: bc.height,
              backgroundColor: paint.backgroundColor,
              borderColor:
                selected || draftSource || editing ? "#2563eb" : paint.borderColor,
              zIndex: cssRegionStackingZIndex(bc, {
                elevated: selected || draftSource || editing,
              }),
            }}
            onPointerDown={(e) => startMove(bc.id, e)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (connectMode) return;
              beginEdit(bc.id, bc.label);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editing) commitLabel(bc.id, draftRef.current);
              const store = useStormBoardStore.getState();
              if (!store.selectedBoundedContextIds.includes(bc.id)) {
                store.selectBoundedContext(bc.id);
              }
              store.openContextMenu(e.clientX, e.clientY, {
                kind: "boundedContext",
                id: bc.id,
              });
            }}
          >
            {paint.locked && (
              <div
                className="pointer-events-none absolute right-2 top-2 z-40 rounded bg-blue-100 p-1 text-blue-800"
                title="Gesperrt"
              >
                <Lock className="h-3 w-3" aria-hidden />
              </div>
            )}
            {editing ? (
              <input
                ref={inputRef}
                type="text"
                className="absolute -top-3 left-3 z-50 min-w-[8rem] max-w-[min(20rem,calc(100%-1.5rem))] rounded border border-blue-500 bg-white px-2 py-0.5 text-xs font-semibold text-blue-900 outline-none"
                value={draft}
                aria-label="Bounded Context umbenennen"
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => setDraftValue(e.target.value)}
                onBlur={() => commitLabel(bc.id, draftRef.current)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    commitLabel(bc.id, draftRef.current);
                  }
                }}
              />
            ) : (
              <div className="pointer-events-none absolute -top-3 left-3 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
                {bc.label}
              </div>
            )}
            {viewNav && !editing && (
              <button
                type="button"
                title={
                  viewNav.direction === "down"
                    ? `Detail-Sicht öffnen (${viewNav.targetViewName})`
                    : `Übersicht öffnen (${viewNav.targetViewName})`
                }
                aria-label={
                  viewNav.direction === "down"
                    ? `Detail-Sicht öffnen (${viewNav.targetViewName})`
                    : `Übersicht öffnen (${viewNav.targetViewName})`
                }
                className={[
                  "absolute z-50 flex h-6 w-6 items-center justify-center rounded-full border border-blue-600 bg-white text-blue-800 shadow-sm hover:bg-blue-50",
                  paint.locked ? "right-9 top-2" : "right-2 top-2",
                ].join(" ")}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  navigateBoundedContextViewLink(bc.id);
                }}
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            {bc.purpose && !editing && (
              <p className="pointer-events-none absolute bottom-2 left-3 right-3 truncate text-[10px] text-blue-800/80">
                {bc.purpose}
              </p>
            )}

            {selected &&
              !editing &&
              !paint.locked &&
              (Object.keys(HANDLE_POSITIONS) as ResizeHandle[]).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={`Größe ändern (${handle})`}
                  className={[
                    "absolute z-40 rounded-sm border border-blue-700 bg-white shadow-sm h-2.5 w-2.5 max-lg:h-4 max-lg:w-4",
                    HANDLE_POSITIONS[handle],
                  ].join(" ")}
                  onPointerDown={(e) => startResize(bc.id, handle, e)}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}
