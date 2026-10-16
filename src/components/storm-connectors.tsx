"use client";

import { useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import {
  beginConnectorEndpointDrag,
  connectorEndpointHandleRadius,
  type ConnectorEndpoint,
} from "@/lib/connector-endpoint-drag";
import { elementCenter, relationAnchors } from "@/lib/connector-geometry";
import { ConnectorSnapTargetHighlight } from "@/components/connector-snap-highlight";
import {
  connectorEndpointDragPreview,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import {
  connectorHitStrokeWidth,
  connectorStrokeDasharray,
  relationCanvasCaption,
  resolveRelationStrokeStyle,
} from "@/lib/connector-style";
import { matchElementSearch, normalizeSearchQuery } from "@/lib/element-search";
import { ProgressMarkConnectorBadge } from "@/components/progress-mark-badge";
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

function stopCanvasPan(e: ReactPointerEvent | ReactMouseEvent) {
  e.stopPropagation();
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
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
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
  const hitWidth = connectorHitStrokeWidth(zoom);
  const viewport = useStormBoardStore((s) => s.viewport);
  const elementsForHighlight = useStormBoardStore((s) => s.elements);
  const swimlanesForHighlight = useStormBoardStore((s) => s.swimlanes);
  const boundedContextsForHighlight = useStormBoardStore((s) => s.boundedContexts);
  const [endpointDrag, setEndpointDrag] = useState<{
    relationId: string;
    endpoint: ConnectorEndpoint;
    lineEnd: { x: number; y: number };
    target: ConnectorAttachTarget | null;
    valid: boolean;
  } | null>(null);

  const canvasContainerRect = () =>
    document.querySelector("[data-storm-canvas]")?.getBoundingClientRect() ?? null;

  const startEndpointDrag = (
    relationId: string,
    endpoint: ConnectorEndpoint,
    fixed: { x: number; y: number },
    e: ReactPointerEvent,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectRelation(relationId);
    const store = useStormBoardStore.getState();
    store.beginGesture();
    setEndpointDrag({
      relationId,
      endpoint,
      lineEnd: fixed,
      target: null,
      valid: false,
    });

    beginConnectorEndpointDrag({
      zoom,
      viewport,
      getContainerRect: canvasContainerRect,
      onMove: (world) => {
        const live = useStormBoardStore.getState();
        const preview = connectorEndpointDragPreview(
          world,
          fixed,
          live.elements,
          live.swimlanes,
          live.boundedContexts,
          "element",
        );
        setEndpointDrag({ relationId, endpoint, ...preview });
      },
      onCommit: (world) => {
        const live = useStormBoardStore.getState();
        const preview = connectorEndpointDragPreview(
          world,
          fixed,
          live.elements,
          live.swimlanes,
          live.boundedContexts,
          "element",
        );
        if (preview.valid && preview.target?.kind === "element") {
          live.reconnectRelation(relationId, endpoint, preview.target.id);
        }
        setEndpointDrag(null);
        live.endGesture();
      },
      onCancel: () => {
        setEndpointDrag(null);
        useStormBoardStore.getState().endGesture();
      },
    });
  };

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
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        // Offset badge perpendicular to the line so it stays readable beside the stroke.
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        const badgeOffset = 14;
        const badgeX = midX + (-dy / len) * badgeOffset;
        const badgeY = midY + (dx / len) * badgeOffset;
        const strokeStyle = resolveRelationStrokeStyle(rel);
        const selected = rel.id === selectedRelationId;
        const involvesFocusType =
          src.type === paletteType || tgt.type === paletteType;
        const dimForFocus = focusMode && !involvesFocusType;
        const dimForSearch =
          searchHitIds !== null && !searchHitIds.has(src.id) && !searchHitIds.has(tgt.id);
        const dimmed = dimForFocus || dimForSearch;
        const mark = rel.progressMark;
        const caption = relationCanvasCaption(rel);
        const handleR = connectorEndpointHandleRadius(selected);
        const draggingThis = endpointDrag?.relationId === rel.id;
        const displayStart =
          draggingThis && endpointDrag.endpoint === "source" ? endpointDrag.lineEnd : start;
        const displayEnd =
          draggingThis && endpointDrag.endpoint === "target" ? endpointDrag.lineEnd : end;
        const dragSnapActive = draggingThis && endpointDrag.valid;

        const selectThis = (e: ReactPointerEvent | ReactMouseEvent) => {
          stopCanvasPan(e);
          if (e.type === "pointerdown") {
            if ("button" in e && e.button !== 0) return;
            e.preventDefault();
          }
          onSelectRelation(rel.id);
        };

        return (
          <g key={rel.id} opacity={dimmed ? 0.22 : 1}>
            {/* Wide invisible stroke for hit-testing without stealing the line bbox. */}
            <line
              x1={displayStart.x}
              y1={displayStart.y}
              x2={displayEnd.x}
              y2={displayEnd.y}
              stroke="transparent"
              strokeWidth={hitWidth}
              strokeLinecap="round"
              className="pointer-events-auto cursor-pointer"
              onPointerDown={selectThis}
              onClick={selectThis}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const store = useStormBoardStore.getState();
                store.selectRelation(rel.id);
                store.openContextMenu(e.clientX, e.clientY, { kind: "relation", id: rel.id });
              }}
            />
            <line
              x1={displayStart.x}
              y1={displayStart.y}
              x2={displayEnd.x}
              y2={displayEnd.y}
              stroke={draggingThis && !dragSnapActive ? "#e9c46a" : selected ? "#2a9d8f" : "#8b9aab"}
              strokeWidth={selected || draggingThis ? 3 : 2}
              strokeDasharray={
                draggingThis && !dragSnapActive ? "6 4" : connectorStrokeDasharray(strokeStyle)
              }
              strokeLinecap={strokeStyle === "dotted" ? "round" : undefined}
              markerEnd={selected ? "url(#storm-arrowhead-selected)" : "url(#storm-arrowhead)"}
              className="pointer-events-none"
            />
            {caption ? (
              <text
                x={midX}
                y={midY - 8}
                textAnchor="middle"
                className="pointer-events-auto cursor-pointer fill-[var(--muted)] text-[10px]"
                onPointerDown={selectThis}
                onClick={selectThis}
              >
                {caption}
              </text>
            ) : null}
            {mark && (
              <g transform={`translate(${badgeX}, ${badgeY})`}>
                <ProgressMarkConnectorBadge mark={mark} />
              </g>
            )}
            {selected && handleR > 0 && (
              <>
                <circle
                  cx={start.x}
                  cy={start.y}
                  r={handleR}
                  fill="#fff"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                  className="pointer-events-auto cursor-grab"
                  onPointerDown={(e) => startEndpointDrag(rel.id, "source", end, e)}
                />
                <circle
                  cx={end.x}
                  cy={end.y}
                  r={handleR}
                  fill="#fff"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                  className="pointer-events-auto cursor-grab"
                  onPointerDown={(e) => startEndpointDrag(rel.id, "target", start, e)}
                />
              </>
            )}
          </g>
        );
      })}

      {endpointDrag?.target && (
        <ConnectorSnapTargetHighlight
          target={endpointDrag.target}
          valid={endpointDrag.valid}
          elements={elementsForHighlight}
          swimlanes={swimlanesForHighlight}
          boundedContexts={boundedContextsForHighlight}
        />
      )}

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
