"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import { useStormBoardStore } from "@/store/storm-board-store";
import { LINE_ARROW_HEAD_LABELS } from "@/types/canvas-annotation";

export interface CanvasLinesProps {
  selectedLineId: string | null;
  onSelectLine: (id: string | null) => void;
  draftLine?: { x1: number; y1: number; x2: number; y2: number } | null;
}

type LineEndpoint = "start" | "end";

function markerEndId(selected: boolean): string {
  return selected ? "canvas-line-arrow-end-selected" : "canvas-line-arrow-end";
}

function markerStartId(selected: boolean): string {
  return selected ? "canvas-line-arrow-start-selected" : "canvas-line-arrow-start";
}

function handleRadius(selected: boolean): number {
  return selected ? 6 : 0;
}

export function CanvasLines({ selectedLineId, onSelectLine, draftLine }: CanvasLinesProps) {
  const canvasLines = useStormBoardStore((s) => s.canvasLines);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const updateCanvasLine = useStormBoardStore((s) => s.updateCanvasLine);
  const lineDrawMode = useStormBoardStore((s) => s.lineDrawMode);

  const startEndpointDrag = (
    lineId: string,
    endpoint: LineEndpoint,
    e: ReactPointerEvent,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectLine(lineId);

    const store = useStormBoardStore.getState();
    const line = store.canvasLines.find((l) => l.id === lineId);
    if (!line) return;

    store.beginGesture();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      if (endpoint === "start") {
        updateCanvasLine(lineId, { x1: orig.x1 + dx, y1: orig.y1 + dy });
      } else {
        updateCanvasLine(lineId, { x2: orig.x2 + dx, y2: orig.y2 + dy });
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      useStormBoardStore.getState().endGesture();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startMoveLine = (lineId: string, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectLine(lineId);

    // In draw mode a plain click selects; only drag after a small threshold.
    const store = useStormBoardStore.getState();
    const line = store.canvasLines.find((l) => l.id === lineId);
    if (!line) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 };
    let gestureStarted = false;
    const MOVE_THRESHOLD_PX = 3;

    const onMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!gestureStarted) {
        if (dist < MOVE_THRESHOLD_PX) return;
        gestureStarted = true;
        useStormBoardStore.getState().beginGesture();
      }
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      updateCanvasLine(lineId, {
        x1: orig.x1 + dx,
        y1: orig.y1 + dy,
        x2: orig.x2 + dx,
        y2: orig.y2 + dy,
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (gestureStarted) useStormBoardStore.getState().endGesture();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 9 }}>
      <defs>
        <marker id="canvas-line-arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#64748b" />
        </marker>
        <marker id="canvas-line-arrow-end-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#2a9d8f" />
        </marker>
        <marker
          id="canvas-line-arrow-start"
          markerWidth="8"
          markerHeight="8"
          refX="1"
          refY="3"
          orient="auto"
        >
          <path d="M8,0 L0,3 L8,6 Z" fill="#64748b" />
        </marker>
        <marker
          id="canvas-line-arrow-start-selected"
          markerWidth="8"
          markerHeight="8"
          refX="1"
          refY="3"
          orient="auto"
        >
          <path d="M8,0 L0,3 L8,6 Z" fill="#2a9d8f" />
        </marker>
      </defs>

      {canvasLines.map((line) => {
        const selected = line.id === selectedLineId;
        const stroke = line.color ?? (selected ? "#2a9d8f" : "#64748b");
        const arrow = line.arrowHead ?? "none";
        const r = handleRadius(selected);
        return (
          <g key={line.id}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="transparent"
              strokeWidth={14}
              className={[
                "pointer-events-auto",
                lineDrawMode ? "cursor-pointer" : "cursor-move",
              ].join(" ")}
              onPointerDown={(e) => startMoveLine(line.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLine(line.id);
              }}
            />
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={stroke}
              strokeWidth={selected ? 3 : 2}
              markerEnd={
                arrow === "end" || arrow === "both"
                  ? `url(#${markerEndId(selected)})`
                  : undefined
              }
              markerStart={
                arrow === "start" || arrow === "both"
                  ? `url(#${markerStartId(selected)})`
                  : undefined
              }
              className="pointer-events-none"
            />
            {line.label && (
              <text
                x={(line.x1 + line.x2) / 2}
                y={(line.y1 + line.y2) / 2 - 6}
                textAnchor="middle"
                className="pointer-events-none fill-[var(--muted)] text-[10px]"
              >
                {line.label}
              </text>
            )}
            {selected && (
              <>
                <circle
                  cx={line.x1}
                  cy={line.y1}
                  r={r}
                  fill="#fff"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                  className="pointer-events-auto cursor-grab"
                  onPointerDown={(e) => startEndpointDrag(line.id, "start", e)}
                />
                <circle
                  cx={line.x2}
                  cy={line.y2}
                  r={r}
                  fill="#fff"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                  className="pointer-events-auto cursor-grab"
                  onPointerDown={(e) => startEndpointDrag(line.id, "end", e)}
                />
              </>
            )}
          </g>
        );
      })}

      {draftLine && (
        <line
          x1={draftLine.x1}
          y1={draftLine.y1}
          x2={draftLine.x2}
          y2={draftLine.y2}
          stroke="#e9c46a"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}
    </svg>
  );
}

export function lineArrowHeadShortLabel(head: keyof typeof LINE_ARROW_HEAD_LABELS): string {
  switch (head) {
    case "none":
      return "—";
    case "end":
      return "→";
    case "start":
      return "←";
    case "both":
      return "↔";
    default:
      return "—";
  }
}
