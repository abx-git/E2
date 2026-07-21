"use client";

import { elementIdsInBoundedContext } from "@/lib/region-containment";
import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_SIZE = 80;

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
  const selectedBoundedContextId = useStormBoardStore((s) => s.selectedBoundedContextId);
  const selectBoundedContext = useStormBoardStore((s) => s.selectBoundedContext);
  const updateBoundedContext = useStormBoardStore((s) => s.updateBoundedContext);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const contextMapMode = useStormBoardStore((s) => s.contextMapMode);
  const contextMapDraftSourceId = useStormBoardStore((s) => s.contextMapDraftSourceId);

  const startMove = (bcId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
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
      {boundedContexts.map((bc) => {
        const selected = selectedBoundedContextId === bc.id;
        const draftSource = contextMapDraftSourceId === bc.id;
        return (
          <div
            key={bc.id}
            className={[
              "absolute rounded-lg border-2",
              selected || draftSource ? "border-blue-600 ring-2 ring-blue-300" : "border-blue-400/70",
              draftSource ? "ring-[#e9c46a]" : "",
              contextMapMode ? "cursor-crosshair" : "cursor-move",
            ].join(" ")}
            style={{
              left: bc.x,
              top: bc.y,
              width: bc.width,
              height: bc.height,
              backgroundColor: bc.color ? `${bc.color}66` : "rgba(219,234,254,0.35)",
              zIndex: selected ? 6 : 2,
            }}
            onPointerDown={(e) => startMove(bc.id, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const store = useStormBoardStore.getState();
              store.selectBoundedContext(bc.id);
              store.openContextMenu(e.clientX, e.clientY, {
                kind: "boundedContext",
                id: bc.id,
              });
            }}
          >
            <div className="pointer-events-none absolute -top-3 left-3 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
              {bc.label}
            </div>
            {bc.purpose && (
              <p className="pointer-events-none absolute bottom-2 left-3 right-3 truncate text-[10px] text-blue-800/80">
                {bc.purpose}
              </p>
            )}

            {selected &&
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
