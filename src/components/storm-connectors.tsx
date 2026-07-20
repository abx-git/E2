"use client";

import type { StormElement } from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";
import { ELEMENT_STYLES } from "@/lib/element-styles";

function centerOf(el: StormElement): { x: number; y: number } {
  const style = ELEMENT_STYLES[el.type];
  const w = el.width ?? style.defaultWidth;
  const h = el.height ?? style.defaultHeight;
  return { x: el.x + w / 2, y: el.y + h / 2 };
}

export interface StormConnectorsProps {
  elements: StormElement[];
  relations: StormRelation[];
  selectedRelationId: string | null;
  onSelectRelation: (id: string | null) => void;
}

export function StormConnectors({
  elements,
  relations,
  selectedRelationId,
  onSelectRelation,
}: StormConnectorsProps) {
  const byId = new Map(elements.map((e) => [e.id, e]));

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 10 }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#64748b" />
        </marker>
      </defs>
      {relations.map((rel) => {
        const src = byId.get(rel.sourceId);
        const tgt = byId.get(rel.targetId);
        if (!src || !tgt) return null;
        const s = centerOf(src);
        const t = centerOf(tgt);
        const dashed = rel.type === "informs";
        const selected = rel.id === selectedRelationId;
        return (
          <g key={rel.id} className="pointer-events-auto cursor-pointer" onClick={() => onSelectRelation(rel.id)}>
            <line
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={selected ? "#0ea5e9" : "#64748b"}
              strokeWidth={selected ? 3 : 2}
              strokeDasharray={dashed ? "6 4" : undefined}
              markerEnd="url(#arrowhead)"
            />
            {rel.label && (
              <text
                x={(s.x + t.x) / 2}
                y={(s.y + t.y) / 2 - 6}
                textAnchor="middle"
                className="fill-slate-600 text-[10px]"
              >
                {rel.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
