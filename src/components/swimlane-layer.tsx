"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function SwimlaneLayer() {
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const selectedSwimlaneId = useStormBoardStore((s) => s.selectedSwimlaneId);
  const selectSwimlane = useStormBoardStore((s) => s.selectSwimlane);

  return (
    <>
      {swimlanes.map((lane) => (
        <div
          key={lane.id}
          className={[
            "absolute left-0 right-0 cursor-pointer border-y",
            selectedSwimlaneId === lane.id
              ? "border-sky-500/90 ring-2 ring-sky-300"
              : "border-slate-300/60",
          ].join(" ")}
          style={{
            top: lane.y,
            height: lane.height,
            backgroundColor: lane.color ?? "rgba(148,163,184,0.12)",
            zIndex: 1,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            selectSwimlane(lane.id);
          }}
        >
          <span className="absolute left-4 top-2 text-xs font-semibold text-slate-500">{lane.label}</span>
        </div>
      ))}
    </>
  );
}
