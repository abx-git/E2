"use client";

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

export function SwimlaneLayer() {
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const selectedSwimlaneId = useStormBoardStore((s) => s.selectedSwimlaneId);
  const selectSwimlane = useStormBoardStore((s) => s.selectSwimlane);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);

  const startMove = (laneId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectSwimlane(laneId);

    const lane = useStormBoardStore.getState().swimlanes.find((l) => l.id === laneId);
    if (!lane) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: lane.x ?? 0, y: lane.y };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      updateSwimlane(laneId, { x: orig.x + dx, y: orig.y + dy });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startResize = (laneId: string, handle: ResizeHandle, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectSwimlane(laneId);

    const lane = useStormBoardStore.getState().swimlanes.find((l) => l.id === laneId);
    if (!lane) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = {
      x: lane.x ?? 0,
      y: lane.y,
      width: lane.width ?? 4000,
      height: lane.height,
    };

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

      updateSwimlane(laneId, { x, y, width, height });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      {swimlanes.map((lane) => {
        const selected = selectedSwimlaneId === lane.id;
        return (
          <div
            key={lane.id}
            className={[
              "absolute border-y-2",
              selected ? "border-sky-500 ring-2 ring-sky-300" : "border-slate-300/70",
              "cursor-move",
            ].join(" ")}
            style={{
              left: lane.x ?? 0,
              top: lane.y,
              width: lane.width ?? 4000,
              height: lane.height,
              backgroundColor: lane.color ?? "rgba(148,163,184,0.12)",
              zIndex: selected ? 4 : 2,
            }}
            onPointerDown={(e) => startMove(lane.id, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const store = useStormBoardStore.getState();
              store.selectSwimlane(lane.id);
              store.openContextMenu(e.clientX, e.clientY, { kind: "swimlane", id: lane.id });
            }}
          >
            <div className="absolute left-3 top-2 rounded bg-slate-100/90 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {lane.label}
            </div>

            {selected &&
              (Object.keys(HANDLE_POSITIONS) as ResizeHandle[]).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={`Größe ändern (${handle})`}
                  className={[
                    "absolute z-10 h-2.5 w-2.5 rounded-sm border border-sky-700 bg-white shadow-sm",
                    HANDLE_POSITIONS[handle],
                  ].join(" ")}
                  onPointerDown={(e) => startResize(lane.id, handle, e)}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}
