"use client";

import { CONTEXT_MAP_PATTERN_LABELS, type ContextMapPattern, type ContextRelation } from "@/types/storm-relation";
import type { BoundedContext } from "@/types/storm-element";
import { useStormBoardStore } from "@/store/storm-board-store";

export interface ContextMapConnectorsProps {
  boundedContexts: BoundedContext[];
  contextRelations: ContextRelation[];
  selectedContextRelationId: string | null;
  contextMapDraftSourceId?: string | null;
  onSelectContextRelation: (id: string | null) => void;
}

const PATTERN_STYLE: Record<
  ContextMapPattern,
  { stroke: string; dash?: string; width: number; double?: boolean }
> = {
  partnership: { stroke: "#2a9d8f", width: 3 },
  sharedKernel: { stroke: "#c9a227", width: 2.5, double: true },
  customerSupplier: { stroke: "#457b9d", width: 2.5 },
  conformist: { stroke: "#6c757d", width: 2, dash: "8 4" },
  antiCorruptionLayer: { stroke: "#e76f51", width: 2.5, dash: "4 3" },
  openHostService: { stroke: "#2a9d8f", width: 2.5 },
  publishedLanguage: { stroke: "#264653", width: 2, dash: "2 2" },
  separateWays: { stroke: "#adb5bd", width: 2, dash: "10 6" },
};

function bcCenter(bc: BoundedContext) {
  return { x: bc.x + bc.width / 2, y: bc.y + bc.height / 2 };
}

export function ContextMapConnectors({
  boundedContexts,
  contextRelations,
  selectedContextRelationId,
  contextMapDraftSourceId,
  onSelectContextRelation,
}: ContextMapConnectorsProps) {
  const byId = new Map(boundedContexts.map((b) => [b.id, b]));
  const draftSource = contextMapDraftSourceId ? byId.get(contextMapDraftSourceId) : undefined;

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 5 }}>
      <defs>
        <marker id="ctx-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#457b9d" />
        </marker>
        <marker id="ctx-arrow-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#2a9d8f" />
        </marker>
        <marker id="ctx-arrow-draft" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#e9c46a" />
        </marker>
      </defs>

      {contextRelations.map((rel) => {
        const src = byId.get(rel.sourceContextId);
        const tgt = byId.get(rel.targetContextId);
        if (!src || !tgt) return null;
        const start = bcCenter(src);
        const end = bcCenter(tgt);
        const style = PATTERN_STYLE[rel.type];
        const selected = rel.id === selectedContextRelationId;
        const stroke = selected ? "#2a9d8f" : style.stroke;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const label = rel.label ?? CONTEXT_MAP_PATTERN_LABELS[rel.type];

        return (
          <g key={rel.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="transparent"
              strokeWidth={14}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onSelectContextRelation(rel.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const store = useStormBoardStore.getState();
                store.selectContextRelation(rel.id);
                store.openContextMenu(e.clientX, e.clientY, {
                  kind: "contextRelation",
                  id: rel.id,
                });
              }}
            />
            {style.double && (
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={stroke}
                strokeWidth={style.width + 4}
                strokeOpacity={0.25}
                className="pointer-events-none"
              />
            )}
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={stroke}
              strokeWidth={selected ? style.width + 1 : style.width}
              strokeDasharray={style.dash}
              markerEnd={selected ? "url(#ctx-arrow-selected)" : "url(#ctx-arrow)"}
              className="pointer-events-none"
            />
            <text
              x={midX}
              y={midY - 8}
              textAnchor="middle"
              className="pointer-events-none fill-[var(--muted)] text-[10px] font-medium"
            >
              {label}
            </text>
          </g>
        );
      })}

      {draftSource && (
        <line
          x1={bcCenter(draftSource).x}
          y1={bcCenter(draftSource).y}
          x2={bcCenter(draftSource).x + 40}
          y2={bcCenter(draftSource).y - 40}
          stroke="#e9c46a"
          strokeWidth={2}
          strokeDasharray="4 3"
          markerEnd="url(#ctx-arrow-draft)"
        />
      )}
    </svg>
  );
}
