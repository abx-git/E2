"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function TimelineGuide() {
  const timeline = useStormBoardStore((s) => s.timeline);
  const setTimeline = useStormBoardStore((s) => s.setTimeline);
  const openContextMenu = useStormBoardStore((s) => s.openContextMenu);

  if (timeline.visible === false) return null;

  const startMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const startY = e.clientY;
    const origY = timeline.y;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const z = useStormBoardStore.getState().viewport.zoom || 1;
      setTimeline({ y: origY + (ev.clientY - startY) / z });
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
    <div
      className="absolute left-0 right-0 z-[6] cursor-ns-resize"
      style={{ top: timeline.y - 12, height: 24 }}
      onPointerDown={startMove}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, { kind: "timeline" });
      }}
      title="Timeline ziehen · Rechtsklick für Optionen"
    >
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[var(--accent-2)]/80" />
      <div className="pointer-events-none absolute left-4 top-0 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel-solid)] px-2 py-0.5 text-[0.72rem] font-medium text-[var(--accent-2)] shadow-dock">
        Timeline
        {timeline.startLabel
          ? ` · ${timeline.startLabel} → ${timeline.endLabel ?? "Ende"}`
          : ""}
      </div>
    </div>
  );
}
