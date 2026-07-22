"use client";

import { ClipboardList, ClipboardPaste, Trash2 } from "lucide-react";

import { CLIPBOARD_DROP_ATTR } from "@/lib/board-clipboard";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { screenToWorld } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";

export function ClipboardPanel() {
  const clipboard = useStormBoardStore((s) => s.clipboard);
  const highlight = useStormBoardStore((s) => s.clipboardDropHighlight);
  const pasteClipboardAt = useStormBoardStore((s) => s.pasteClipboardAt);
  const clearClipboard = useStormBoardStore((s) => s.clearClipboard);
  const viewport = useStormBoardStore((s) => s.viewport);
  const count = clipboard?.elements.length ?? 0;

  const pasteAtViewportCenter = () => {
    const canvas = document.querySelector<HTMLElement>("[data-storm-canvas]");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) {
      pasteClipboardAt(200, 200);
      return;
    }
    const world = screenToWorld(
      viewport,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      rect,
    );
    pasteClipboardAt(world.x, world.y);
  };

  return (
    <section
      className={[
        "border-t border-[var(--border)] p-3 transition-colors",
        highlight ? "bg-[var(--accent)]/15 ring-1 ring-inset ring-[var(--accent)]" : "",
      ].join(" ")}
      {...{ [CLIPBOARD_DROP_ATTR]: "" }}
      aria-label="Zwischenablage"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="group-label flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Zwischenablage
          {count > 0 && (
            <span className="rounded bg-[var(--control)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--muted)]">
              {count}
            </span>
          )}
        </h3>
      </div>
      <p className="mt-1 text-[0.65rem] leading-snug text-[var(--muted)]">
        Elemente per Rechtsklick oder Drag hierher verschieben — in anderer Sicht einfügen.
      </p>

      {count === 0 ? (
        <p
          className={[
            "mt-2 rounded-md border border-dashed px-2 py-4 text-center text-[0.7rem] text-[var(--muted)]",
            highlight ? "border-[var(--accent)]" : "border-[var(--border)]",
          ].join(" ")}
        >
          Leer — Elemente hierher ziehen
        </p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {clipboard!.elements.map((el) => (
            <li
              key={el.id}
              className="truncate rounded-md px-2 py-1 text-xs"
              style={{
                backgroundColor: ELEMENT_STYLES[el.type].fill,
                color: ELEMENT_STYLES[el.type].ink,
              }}
              title={ELEMENT_STYLES[el.type].label}
            >
              {el.label || ELEMENT_STYLES[el.type].shortLabel}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={count === 0}
          onClick={pasteAtViewportCenter}
          className="dock-control flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-40"
          title="In die aktuelle Sicht einfügen (Viewport-Mitte)"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Einfügen
        </button>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => clearClipboard()}
          className="dock-control flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Leeren
        </button>
      </div>
    </section>
  );
}
