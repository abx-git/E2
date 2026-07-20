"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function TimelineGuide() {
  const timeline = useStormBoardStore((s) => s.timeline);

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-slate-400"
      style={{ top: timeline.y, zIndex: 5 }}
    >
      <span className="absolute -top-5 left-4 rounded bg-white px-2 text-xs font-medium text-slate-500">
        Timeline {timeline.startLabel ? `(${timeline.startLabel} → ${timeline.endLabel ?? "Ende"})` : ""}
      </span>
    </div>
  );
}
