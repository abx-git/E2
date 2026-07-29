"use client";

import { useStormBoardStore } from "@/store/storm-board-store";
import { LINE_ARROW_HEAD_LABELS } from "@/types/canvas-annotation";

export interface CanvasLinesProps {
  selectedLineId: string | null;
  onSelectLine: (id: string | null) => void;
  draftLine?: { x1: number; y1: number; x2: number; y2: number } | null;
}

function markerEndId(selected: boolean): string {
  return selected ? "canvas-line-arrow-end-selected" : "canvas-line-arrow-end";
}

function markerStartId(selected: boolean): string {
  return selected ? "canvas-line-arrow-start-selected" : "canvas-line-arrow-start";
}

export function CanvasLines({ selectedLineId, onSelectLine, draftLine }: CanvasLinesProps) {
  const canvasLines = useStormBoardStore((s) => s.canvasLines);

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
        return (
          <g key={line.id}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="transparent"
              strokeWidth={14}
              className="pointer-events-auto cursor-pointer"
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
