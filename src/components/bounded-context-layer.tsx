"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function BoundedContextLayer() {
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);

  return (
    <>
      {boundedContexts.map((bc) => (
        <div
          key={bc.id}
          className="pointer-events-none absolute rounded-lg border-2 border-blue-400/70"
          style={{
            left: bc.x,
            top: bc.y,
            width: bc.width,
            height: bc.height,
            backgroundColor: bc.color ? `${bc.color}66` : "rgba(219,234,254,0.35)",
            zIndex: 2,
          }}
        >
          <div className="absolute -top-3 left-3 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
            {bc.label}
          </div>
          {bc.purpose && (
            <p className="absolute bottom-2 left-3 right-3 truncate text-[10px] text-blue-800/80">{bc.purpose}</p>
          )}
        </div>
      ))}
    </>
  );
}
