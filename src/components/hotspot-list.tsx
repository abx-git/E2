"use client";

import { useStormBoardStore } from "@/store/storm-board-store";

export function HotspotList() {
  const elements = useStormBoardStore((s) => s.elements);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const hotspots = elements.filter((e) => e.type === "hotspot");

  if (hotspots.length === 0) return null;

  return (
    <section className="border-t border-[var(--border)] p-3">
      <h3 className="group-label">Hotspots</h3>
      <ul className="mt-2 space-y-1">
        {hotspots.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => selectElement(h.id)}
              className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-[var(--control-hover)]"
            >
              <span
                className={
                  h.metadata?.hotspotStatus === "resolved"
                    ? "text-[var(--muted)] line-through"
                    : "text-[#f0a8a0]"
                }
              >
                {h.label}
              </span>
              {h.metadata?.hotspotPriority === "high" && (
                <span className="ml-1 text-[10px] font-bold text-[var(--accent-2)]">!</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
