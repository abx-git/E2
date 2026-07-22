"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, ClipboardPaste, Trash2 } from "lucide-react";

import { CLIPBOARD_DROP_ATTR, isPointerOverStormCanvas } from "@/lib/board-clipboard";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { screenToWorld } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { StormElement } from "@/types/storm-element";

const DRAG_THRESHOLD_PX = 5;

export function ClipboardPanel() {
  const clipboard = useStormBoardStore((s) => s.clipboard);
  const highlight = useStormBoardStore((s) => s.clipboardDropHighlight);
  const pasteClipboardAt = useStormBoardStore((s) => s.pasteClipboardAt);
  const clearClipboard = useStormBoardStore((s) => s.clearClipboard);
  const viewport = useStormBoardStore((s) => s.viewport);
  const count = clipboard?.elements.length ?? 0;

  const [ghost, setGhost] = useState<{
    el: StormElement;
    x: number;
    y: number;
    overCanvas: boolean;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

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

  const beginItemDrag = (el: StormElement, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    dragRef.current = { id: el.id, startX, startY, active: false };

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== el.id) return;
      const dist = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY);
      if (!drag.active && dist < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      const overCanvas = isPointerOverStormCanvas(ev.clientX, ev.clientY);
      setGhost({
        el,
        x: ev.clientX,
        y: ev.clientY,
        overCanvas,
      });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      setGhost(null);
      if (!drag?.active) return;

      if (!isPointerOverStormCanvas(ev.clientX, ev.clientY)) return;

      const canvas = document.querySelector<HTMLElement>("[data-storm-canvas]");
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return;
      const world = screenToWorld(
        useStormBoardStore.getState().viewport,
        ev.clientX,
        ev.clientY,
        rect,
      );
      useStormBoardStore.getState().takeClipboardElementsAt([el.id], world.x, world.y);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const style = ghost ? ELEMENT_STYLES[ghost.el.type] : null;

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
        Rein: Rechtsklick oder Drag. Raus: Eintrag auf den Canvas ziehen.
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
            <li key={el.id}>
              <button
                type="button"
                className="w-full cursor-grab truncate rounded-md px-2 py-1 text-left text-xs active:cursor-grabbing"
                style={{
                  backgroundColor: ELEMENT_STYLES[el.type].fill,
                  color: ELEMENT_STYLES[el.type].ink,
                }}
                title={`${ELEMENT_STYLES[el.type].label} — auf Canvas ziehen`}
                onPointerDown={(e) => beginItemDrag(el, e)}
              >
                {el.label || ELEMENT_STYLES[el.type].shortLabel}
              </button>
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
          title="Alle in die aktuelle Sicht einfügen (Viewport-Mitte)"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Alle einfügen
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

      {ghost &&
        style &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[1300] max-w-[10rem] truncate rounded-md border px-2 py-1 text-xs shadow-lg"
            style={{
              left: ghost.x + 12,
              top: ghost.y + 12,
              backgroundColor: style.fill,
              color: style.ink,
              borderColor: style.stroke,
              opacity: ghost.overCanvas ? 1 : 0.55,
            }}
          >
            {ghost.el.label || style.shortLabel}
          </div>,
          document.body,
        )}
    </section>
  );
}
