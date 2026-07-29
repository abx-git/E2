"use client";

import { ListPlus } from "lucide-react";

import { useStormBoardStore } from "@/store/storm-board-store";

export function HotspotList() {
  const elements = useStormBoardStore((s) => s.elements);
  const selectElement = useStormBoardStore((s) => s.selectElement);
  const addActionItem = useStormBoardStore((s) => s.addActionItem);
  const hotspots = elements.filter((e) => e.type === "hotspot");

  if (hotspots.length === 0) return null;

  return (
    <section className="border-t border-[var(--border)] p-3">
      <h3 className="group-label">Hotspots</h3>
      <ul className="mt-2 space-y-1">
        {hotspots.map((h) => (
          <li key={h.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => selectElement(h.id)}
              className="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs hover:bg-[var(--control-hover)]"
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
            <button
              type="button"
              className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[var(--accent)]"
              title="Als To-do übernehmen"
              aria-label={`Hotspot „${h.label}“ als To-do übernehmen`}
              onClick={() =>
                addActionItem({
                  title: h.label,
                  notes: h.description,
                  status: h.metadata?.hotspotStatus === "resolved" ? "done" : "open",
                  area: "problem",
                  elementId: h.id,
                })
              }
            >
              <ListPlus className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
