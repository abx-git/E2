"use client";

import { GripVertical } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_HEIGHT = 60;
/** Über Element-Karten (z≈20–30), damit der Griff immer greifbar ist. */
const INTERACTIVE_Z = 35;

export function SwimlaneLayer() {
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const selectedSwimlaneId = useStormBoardStore((s) => s.selectedSwimlaneId);
  const selectSwimlane = useStormBoardStore((s) => s.selectSwimlane);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);

  const startMove = (laneId: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const lane = useStormBoardStore.getState().swimlanes.find((l) => l.id === laneId);
    if (!lane) return;

    selectSwimlane(laneId);

    const startY = e.clientY;
    const origY = lane.y;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const zoom = useStormBoardStore.getState().viewport.zoom || 1;
      updateSwimlane(laneId, { y: origY + (ev.clientY - startY) / zoom });
    };

    const onUp = (ev: PointerEvent) => {
      if (target.hasPointerCapture(ev.pointerId)) {
        target.releasePointerCapture(ev.pointerId);
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const startResize = (laneId: string, edge: "n" | "s", e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const lane = useStormBoardStore.getState().swimlanes.find((l) => l.id === laneId);
    if (!lane) return;

    selectSwimlane(laneId);

    const startY = e.clientY;
    const orig = { y: lane.y, height: lane.height };
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const zoom = useStormBoardStore.getState().viewport.zoom || 1;
      const dy = (ev.clientY - startY) / zoom;
      if (edge === "s") {
        updateSwimlane(laneId, { height: Math.max(MIN_HEIGHT, orig.height + dy) });
      } else {
        const nextHeight = Math.max(MIN_HEIGHT, orig.height - dy);
        updateSwimlane(laneId, {
          y: orig.y + (orig.height - nextHeight),
          height: nextHeight,
        });
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (target.hasPointerCapture(ev.pointerId)) {
        target.releasePointerCapture(ev.pointerId);
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  return (
    <>
      {swimlanes.map((lane) => {
        const selected = selectedSwimlaneId === lane.id;
        return (
          <div key={lane.id}>
            {/* Hintergrund — keine Pointer-Events, damit Marquee/Elemente darunter greifen */}
            <div
              className={[
                "pointer-events-none absolute left-0 right-0 border-y",
                selected ? "border-sky-500/90 ring-2 ring-sky-300" : "border-slate-300/60",
              ].join(" ")}
              style={{
                top: lane.y,
                height: lane.height,
                backgroundColor: lane.color ?? "rgba(148,163,184,0.12)",
                zIndex: 1,
              }}
            />

            {/* Drag-Griff — eigener Stacking-Kontext über den Karten */}
            <button
              type="button"
              title="Swimlane ziehen"
              aria-label={`Swimlane „${lane.label}“ verschieben`}
              className={[
                "absolute left-0 flex w-9 cursor-grab flex-col items-center gap-1 border border-slate-300/80 bg-white/90 py-2 text-slate-600 shadow-md active:cursor-grabbing",
                selected
                  ? "border-sky-500 bg-sky-50 text-sky-800"
                  : "hover:bg-white hover:text-slate-800",
              ].join(" ")}
              style={{
                top: lane.y,
                height: lane.height,
                zIndex: INTERACTIVE_Z,
              }}
              onPointerDown={(e) => startMove(lane.id, e)}
            >
              <GripVertical className="h-4 w-4 shrink-0" aria-hidden />
              <span
                className="max-h-[calc(100%-1.5rem)] overflow-hidden text-[10px] font-semibold leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {lane.label}
              </span>
            </button>

            {/* Höhen-Kanten */}
            <div
              role="separator"
              aria-label="Höhe oben ändern"
              title="Höhe oben ändern"
              className={[
                "absolute cursor-ns-resize",
                selected ? "bg-sky-400/30" : "hover:bg-slate-400/25",
              ].join(" ")}
              style={{
                left: 36,
                right: 0,
                top: lane.y - 6,
                height: 12,
                zIndex: INTERACTIVE_Z,
              }}
              onPointerDown={(e) => startResize(lane.id, "n", e)}
            />
            <div
              role="separator"
              aria-label="Höhe unten ändern"
              title="Höhe unten ändern"
              className={[
                "absolute cursor-ns-resize",
                selected ? "bg-sky-400/30" : "hover:bg-slate-400/25",
              ].join(" ")}
              style={{
                left: 36,
                right: 0,
                top: lane.y + lane.height - 6,
                height: 12,
                zIndex: INTERACTIVE_Z,
              }}
              onPointerDown={(e) => startResize(lane.id, "s", e)}
            />
          </div>
        );
      })}
    </>
  );
}
