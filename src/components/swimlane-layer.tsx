"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function SwimlaneLayer() {
  const swimlanes = useStormBoardStore((s) => s.swimlanes);

  return (
    <>
      {swimlanes.map((lane) => (
        <div
          key={lane.id}
          className="pointer-events-none absolute left-0 right-0 border-y border-slate-300/60"
          style={{
            top: lane.y,
            height: lane.height,
            backgroundColor: lane.color ?? "rgba(148,163,184,0.12)",
            zIndex: 1,
          }}
        >
          <span className="absolute left-4 top-2 text-xs font-semibold text-slate-500">{lane.label}</span>
        </div>
      ))}
    </>
  );
}
