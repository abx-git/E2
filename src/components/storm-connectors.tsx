"use client";

import { elementCenter, relationAnchors } from "@/lib/connector-geometry";
import type { StormElement } from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";

export interface StormConnectorsProps {
  elements: StormElement[];
  relations: StormRelation[];
  selectedRelationId: string | null;
  relationDraftSourceId?: string | null;
  onSelectRelation: (id: string | null) => void;
}

export function StormConnectors({
  elements,
  relations,
  selectedRelationId,
  relationDraftSourceId,
  onSelectRelation,
}: StormConnectorsProps) {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const draftSource = relationDraftSourceId ? byId.get(relationDraftSourceId) : undefined;

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 10 }}>
      <defs>
        <marker id="storm-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#64748b" />
        </marker>
        <marker id="storm-arrowhead-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#0ea5e9" />
        </marker>
        <marker id="storm-arrowhead-draft" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#a855f7" />
        </marker>
      </defs>

      {relations.map((rel) => {
        const src = byId.get(rel.sourceId);
        const tgt = byId.get(rel.targetId);
        if (!src || !tgt) return null;
        const { start, end } = relationAnchors(src, tgt);
        const dashed = rel.type === "informs";
        const selected = rel.id === selectedRelationId;
        return (
          <g key={rel.id} className="pointer-events-auto cursor-pointer" onClick={() => onSelectRelation(rel.id)}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={selected ? "#0ea5e9" : "#64748b"}
              strokeWidth={selected ? 3 : 2}
              strokeDasharray={dashed ? "6 4" : undefined}
              markerEnd={selected ? "url(#storm-arrowhead-selected)" : "url(#storm-arrowhead)"}
            />
            {rel.label && (
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 - 6}
                textAnchor="middle"
                className="fill-slate-600 text-[10px]"
              >
                {rel.label}
              </text>
            )}
          </g>
        );
      })}

      {draftSource &&
        elements
          .filter((el) => el.id !== draftSource.id)
          .map((el) => {
            const { start } = relationAnchors(draftSource, el);
            const end = elementCenter(el);
            return (
              <line
                key={`draft-${el.id}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#c084fc"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.35}
              />
            );
          })}
    </svg>
  );
}
