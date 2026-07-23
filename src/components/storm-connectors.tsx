"use client";

import { elementCenter, relationAnchors } from "@/lib/connector-geometry";
import { matchElementSearch, normalizeSearchQuery } from "@/lib/element-search";
import { useStormBoardStore } from "@/store/storm-board-store";
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
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const searchQuery = useStormBoardStore((s) => s.searchQuery);
  const views = useStormBoardStore((s) => s.views);
  const viewNameById = Object.fromEntries(views.map((v) => [v.id, v.name]));
  const searchActive = Boolean(normalizeSearchQuery(searchQuery));
  const searchHitIds = searchActive
    ? new Set(
        elements
          .filter((el) => matchElementSearch(el, searchQuery, { viewNameById }).match)
          .map((el) => el.id),
      )
    : null;

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 10 }}>
      <defs>
        <marker id="storm-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#8b9aab" />
        </marker>
        <marker id="storm-arrowhead-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#2a9d8f" />
        </marker>
        <marker id="storm-arrowhead-draft" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#e9c46a" />
        </marker>
      </defs>

      {relations.map((rel) => {
        const src = byId.get(rel.sourceId);
        const tgt = byId.get(rel.targetId);
        if (!src || !tgt) return null;
        const { start, end } = relationAnchors(src, tgt);
        const dashed = rel.type === "informs" || rel.type === "annotates";
        const selected = rel.id === selectedRelationId;
        const involvesFocusType =
          src.type === paletteType || tgt.type === paletteType;
        const dimForFocus = focusMode && !involvesFocusType;
        const dimForSearch =
          searchHitIds !== null && !searchHitIds.has(src.id) && !searchHitIds.has(tgt.id);
        const dimmed = dimForFocus || dimForSearch;
        return (
          <g key={rel.id} opacity={dimmed ? 0.22 : 1}>
            {/* Wide invisible stroke for hit-testing without stealing the line bbox. */}
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="transparent"
              strokeWidth={14}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onSelectRelation(rel.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const store = useStormBoardStore.getState();
                store.selectRelation(rel.id);
                store.openContextMenu(e.clientX, e.clientY, { kind: "relation", id: rel.id });
              }}
            />
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={selected ? "#2a9d8f" : "#8b9aab"}
              strokeWidth={selected ? 3 : 2}
              strokeDasharray={dashed ? "6 4" : undefined}
              markerEnd={selected ? "url(#storm-arrowhead-selected)" : "url(#storm-arrowhead)"}
              className="pointer-events-none"
            />
            {rel.label && (
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 - 6}
                textAnchor="middle"
                className="pointer-events-none fill-[var(--muted)] text-[10px]"
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
                stroke="#e9c46a"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.35}
              />
            );
          })}
    </svg>
  );
}
