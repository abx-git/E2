"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_HEIGHT = 60;
const DRAG_THRESHOLD_PX = 4;

type VerticalHandle = "n" | "s";

const HANDLE_POSITIONS: Record<VerticalHandle, string> = {
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
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

    const startY = e.clientY;
    const origY = lane.y;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dyScreen = ev.clientY - startY;
      if (Math.abs(dyScreen) >= DRAG_THRESHOLD_PX) moved = true;
      if (!moved) return;
      updateSwimlane(laneId, { y: origY + dyScreen / zoom });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startResize = (laneId: string, handle: VerticalHandle, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectSwimlane(laneId);

    const lane = useStormBoardStore.getState().swimlanes.find((l) => l.id === laneId);
    if (!lane) return;

    const startY = e.clientY;
    const orig = { y: lane.y, height: lane.height };

    const onMove = (ev: PointerEvent) => {
      const dy = (ev.clientY - startY) / zoom;
      let y = orig.y;
      let height = orig.height;

      if (handle === "s") {
        height = Math.max(MIN_HEIGHT, orig.height + dy);
      } else {
        const nextHeight = Math.max(MIN_HEIGHT, orig.height - dy);
        y = orig.y + (orig.height - nextHeight);
        height = nextHeight;
      }

      updateSwimlane(laneId, { y, height });
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
              "absolute left-0 right-0 border-y",
              selected ? "border-sky-500/90 ring-2 ring-sky-300 cursor-ns-resize" : "border-slate-300/60 cursor-grab",
            ].join(" ")}
            style={{
              top: lane.y,
              height: lane.height,
              backgroundColor: lane.color ?? "rgba(148,163,184,0.12)",
              zIndex: selected ? 5 : 1,
            }}
            onPointerDown={(e) => startMove(lane.id, e)}
          >
            <span className="pointer-events-none absolute left-4 top-2 text-xs font-semibold text-slate-500">
              {lane.label}
            </span>

            {selected &&
              (Object.keys(HANDLE_POSITIONS) as VerticalHandle[]).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={handle === "n" ? "Höhe oben ändern" : "Höhe unten ändern"}
                  className={[
                    "absolute z-10 h-2.5 w-8 rounded-sm border border-sky-600 bg-white shadow-sm",
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
