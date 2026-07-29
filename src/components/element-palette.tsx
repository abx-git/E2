"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

import type { ElementType } from "@/types/storm-element";
import { ELEMENT_STYLES, elementDimensions } from "@/lib/element-styles";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { isPointerOverStormCanvas } from "@/lib/board-clipboard";
import { screenToWorld, snapToGrid, snapToTimeline } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";
import { MODELING_MODE_LABELS } from "@/types/storm-element";

const DRAG_THRESHOLD_PX = 5;

export interface ElementPaletteProps {
  onSelectType: (type: ElementType) => void;
  onRequestHelp?: (type: ElementType) => void;
}

export function ElementPalette({ onSelectType, onRequestHelp }: ElementPaletteProps) {
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const setPaletteType = useStormBoardStore((s) => s.setPaletteType);
  const addElement = useStormBoardStore((s) => s.addElement);
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);

  const [ghost, setGhost] = useState<{
    type: ElementType;
    x: number;
    y: number;
    overCanvas: boolean;
  } | null>(null);
  const dragRef = useRef<{
    type: ElementType;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const allowed = getAllowedTypesForPhase(
    modelingMode,
    workshopFormat,
    facilitatorPhase,
    facilitatorEnabled,
  );
  const modeLabel = MODELING_MODE_LABELS[modelingMode];

  const dropOnCanvas = (type: ElementType, clientX: number, clientY: number) => {
    const canvas = document.querySelector<HTMLElement>("[data-storm-canvas]");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;

    const store = useStormBoardStore.getState();
    const world = screenToWorld(store.viewport, clientX, clientY, rect);
    const dims = elementDimensions(type);
    let x = world.x - dims.width / 2;
    let y = world.y - dims.height / 2;

    if (store.snapToGrid) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }
    if (store.snapToTimeline) {
      y = snapToTimeline(y, store.timeline.y);
    }

    setPaletteType(type);
    onSelectType(type);
    addElement(type, x, y);
  };

  const beginPaletteDrag = (type: ElementType, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    dragRef.current = { type, startX, startY, active: false };

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.type !== type) return;
      const dist = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY);
      if (!drag.active && dist < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setGhost({
        type,
        x: ev.clientX,
        y: ev.clientY,
        overCanvas: isPointerOverStormCanvas(ev.clientX, ev.clientY),
      });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      setGhost(null);

      if (!drag) return;

      if (!drag.active) {
        // Plain click: select palette type (Enter / Doppelklick still place at center).
        setPaletteType(type);
        onSelectType(type);
        return;
      }

      if (!isPointerOverStormCanvas(ev.clientX, ev.clientY)) return;
      dropOnCanvas(type, ev.clientX, ev.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const ghostStyle = ghost ? ELEMENT_STYLES[ghost.type] : null;

  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel-solid)]">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <h2 className="group-label">Elemente</h2>
        <p className="mt-1 text-[0.65rem] leading-snug text-[var(--muted)]">
          {modeLabel} · auf die Karte ziehen
        </p>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">
        {allowed.map((type) => {
          const style = ELEMENT_STYLES[type];
          const active = paletteType === type;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <button
                type="button"
                onPointerDown={(e) => beginPaletteDrag(type, e)}
                className={[
                  "flex-1 cursor-grab rounded-lg border px-2 py-2 text-left text-xs font-medium transition active:cursor-grabbing",
                  active
                    ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel-solid)]"
                    : "opacity-80 hover:opacity-100",
                ].join(" ")}
                style={{
                  backgroundColor: style.fill,
                  borderColor: style.stroke,
                  color: style.ink,
                }}
                title={`${style.label} — auf die Karte ziehen`}
              >
                {style.label}
              </button>
              <button
                type="button"
                className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
                title="Hilfe zu diesem Element"
                aria-label={`Hilfe für ${type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestHelp?.(type);
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {ghost &&
        ghostStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[1300] max-w-[10rem] truncate rounded-md border px-2 py-1.5 text-xs font-medium shadow-lg"
            style={{
              left: ghost.x + 12,
              top: ghost.y + 12,
              backgroundColor: ghostStyle.fill,
              color: ghostStyle.ink,
              borderColor: ghostStyle.stroke,
              opacity: ghost.overCanvas ? 1 : 0.55,
              width: Math.min(ghostStyle.defaultWidth, 160),
            }}
          >
            {ghostStyle.label}
          </div>,
          document.body,
        )}
    </aside>
  );
}
