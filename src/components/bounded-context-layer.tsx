"use client";

import { useEffect, useRef, useState } from "react";

import { cssRegionStackingZIndex, sortByZOrder } from "@/lib/element-z-order";
import { elementIdsInBoundedContext } from "@/lib/region-containment";
import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_SIZE = 80;
const DEFAULT_LABEL = "Bounded Context";

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
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const contextMapDraftSourceId = useStormBoardStore((s) => s.contextMapDraftSourceId);
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
    if (store.contextMapMode) {
      if (store.contextMapDraftSourceId && store.contextMapDraftSourceId !== bcId) {
        store.connectBoundedContexts(store.contextMapDraftSourceId, bcId);
        store.setContextMapDraftSource(null);
      } else {
        store.setContextMapDraftSource(bcId);
        selectBoundedContext(bcId);
      }
      return;
    }

    selectBoundedContext(bcId);
    store.beginGesture();

    const bc = store.boundedContexts.find((b) => b.id === bcId);
    if (!bc) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: bc.x, y: bc.y };
    const moveElementIds = elementIdsInBoundedContext(store.elements, bc);

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      updateBoundedContext(bcId, { x: orig.x + dx, y: orig.y + dy }, { moveElementIds });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      useStormBoardStore.getState().endGesture();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startResize = (bcId: string, handle: ResizeHandle, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectBoundedContext(bcId);
    useStormBoardStore.getState().beginGesture();

    const bc = useStormBoardStore.getState().boundedContexts.find((b) => b.id === bcId);
    if (!bc) return;

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
        return (
          <div
            key={bc.id}
            className={[
              "absolute rounded-lg border-2",
              selected || draftSource || editing
                ? "border-blue-600 ring-2 ring-blue-300"
                : "border-blue-400/70",
              draftSource ? "ring-[#e9c46a]" : "",
              contextMapMode ? "cursor-crosshair" : editing ? "cursor-default" : "cursor-move",
            ].join(" ")}
            style={{
              left: bc.x,
              top: bc.y,
              width: bc.width,
              height: bc.height,
              backgroundColor: bc.color ? `${bc.color}66` : "rgba(219,234,254,0.35)",
              zIndex: cssRegionStackingZIndex(bc, {
                elevated: selected || draftSource || editing,
              }),
            }}
            onPointerDown={(e) => startMove(bc.id, e)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (contextMapMode) return;
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
            {bc.purpose && !editing && (
              <p className="pointer-events-none absolute bottom-2 left-3 right-3 truncate text-[10px] text-blue-800/80">
                {bc.purpose}
              </p>
            )}

            {selected &&
              !editing &&
              (Object.keys(HANDLE_POSITIONS) as ResizeHandle[]).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={`Größe ändern (${handle})`}
                  className={[
                    "absolute z-40 h-2.5 w-2.5 rounded-sm border border-blue-700 bg-white shadow-sm",
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
