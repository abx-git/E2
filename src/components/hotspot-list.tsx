"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function HotspotList() {
  const elements = useStormBoardStore((s) => s.elements);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const hotspots = elements.filter((e) => e.type === "hotspot");

  if (hotspots.length === 0) return null;

  return (
    <section className="border-t border-slate-200 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hotspots</h3>
      <ul className="mt-2 space-y-1">
        {hotspots.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => selectElement(h.id)}
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-red-50"
            >
              <span
                className={
                  h.metadata?.hotspotStatus === "resolved" ? "text-slate-400 line-through" : "text-red-800"
                }
              >
                {h.label}
              </span>
              {h.metadata?.hotspotPriority === "high" && (
                <span className="ml-1 text-[10px] font-bold text-red-600">!</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
