"use client";

import { useMemo } from "react";
import { ListPlus } from "lucide-react";

import { collectBoardHotspots } from "@/lib/board-hotspots";
import { useT } from "@/i18n";
import {
  boardImportPayloadFromStore,
  useStormBoardStore,
} from "@/store/storm-board-store";

export function HotspotList({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const views = useStormBoardStore((s) => s.views);
  const elements = useStormBoardStore((s) => s.elements);
  const navigateTarget = useStormBoardStore((s) => s.navigateToMeasureTarget);
  const addActionItem = useStormBoardStore((s) => s.addActionItem);

  const hotspots = useMemo(
    () => collectBoardHotspots(boardImportPayloadFromStore()),
    [views, elements],
  );

  if (hotspots.length === 0) return null;

  const body = (
    <ul className={embedded ? "space-y-1" : "mt-2 space-y-1"}>
      {hotspots.map((h) => (
        <li key={`${h.viewId}:${h.elementId}`} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigateTarget(h.viewId, h.elementId)}
            className="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs hover:bg-[var(--control-hover)]"
          >
            <span className="text-[var(--muted)]">[{h.viewName}]</span>{" "}
            <span
              className={
                h.status === "resolved"
                  ? "text-[var(--muted)] line-through"
                  : "text-[#f0a8a0]"
              }
            >
              {h.label}
            </span>
            {h.priority === "high" && (
              <span className="ml-1 text-[10px] font-bold text-[var(--accent-2)]">!</span>
            )}
          </button>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-[var(--accent)]"
            title={t("panels.hotspotToTodo")}
            aria-label={t("panels.hotspotToTodoNamed", { label: h.label })}
            onClick={() =>
              addActionItem({
                title: h.label,
                notes: h.description,
                status: h.status === "resolved" ? "done" : "open",
                area: "problem",
                elementId: h.elementId,
              })
            }
          >
            <ListPlus className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );

  if (embedded) return body;

  return (
    <section className="border-t border-[var(--border)] p-3">
      <h3 className="group-label">{t("panels.hotspotsTitle")}</h3>
      {body}
    </section>
  );
}
