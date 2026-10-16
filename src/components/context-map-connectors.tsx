"use client";

import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  beginConnectorEndpointDrag,
  connectorEndpointHandleRadius,
  type ConnectorEndpoint,
} from "@/lib/connector-endpoint-drag";
import { contextRelationAnchors, boundedContextCenter } from "@/lib/connector-geometry";
import { ConnectorSnapTargetHighlight } from "@/components/connector-snap-highlight";
import {
  connectorEndpointDragPreview,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import { connectorHitStrokeWidth } from "@/lib/connector-style";
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

export function ContextMapConnectors({
  boundedContexts,
  contextRelations,
  selectedContextRelationId,
  contextMapDraftSourceId,
  onSelectContextRelation,
}: ContextMapConnectorsProps) {
  const byId = new Map(boundedContexts.map((b) => [b.id, b]));
  const draftSource = contextMapDraftSourceId ? byId.get(contextMapDraftSourceId) : undefined;
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const viewport = useStormBoardStore((s) => s.viewport);
  const hitWidth = connectorHitStrokeWidth(zoom);
  const elementsForHighlight = useStormBoardStore((s) => s.elements);
  const swimlanesForHighlight = useStormBoardStore((s) => s.swimlanes);
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
    onSelectContextRelation(relationId);
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
          "boundedContext",
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
          "boundedContext",
        );
        if (preview.valid && preview.target?.kind === "boundedContext") {
          live.reconnectContextRelation(relationId, endpoint, preview.target.id);
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
        const { start, end } = contextRelationAnchors(src, tgt);
        const style = PATTERN_STYLE[rel.type];
        const selected = rel.id === selectedContextRelationId;
        const stroke = selected ? "#2a9d8f" : style.stroke;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const label = rel.label ?? CONTEXT_MAP_PATTERN_LABELS[rel.type];
        const handleR = connectorEndpointHandleRadius(selected);
        const draggingThis = endpointDrag?.relationId === rel.id;
        const displayStart =
          draggingThis && endpointDrag.endpoint === "source" ? endpointDrag.lineEnd : start;
        const displayEnd =
          draggingThis && endpointDrag.endpoint === "target" ? endpointDrag.lineEnd : end;
        const dragSnapActive = draggingThis && endpointDrag.valid;

        return (
          <g key={rel.id}>
            <line
              x1={displayStart.x}
              y1={displayStart.y}
              x2={displayEnd.x}
              y2={displayEnd.y}
              stroke="transparent"
              strokeWidth={hitWidth}
              strokeLinecap="round"
              className="pointer-events-auto cursor-pointer"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                e.preventDefault();
                onSelectContextRelation(rel.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectContextRelation(rel.id);
              }}
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
                x1={displayStart.x}
                y1={displayStart.y}
                x2={displayEnd.x}
                y2={displayEnd.y}
                stroke={stroke}
                strokeWidth={style.width + 4}
                strokeOpacity={0.25}
                className="pointer-events-none"
              />
            )}
            <line
              x1={displayStart.x}
              y1={displayStart.y}
              x2={displayEnd.x}
              y2={displayEnd.y}
              stroke={draggingThis && !dragSnapActive ? "#e9c46a" : stroke}
              strokeWidth={selected || draggingThis ? style.width + 1 : style.width}
              strokeDasharray={draggingThis && !dragSnapActive ? "6 4" : style.dash}
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
          boundedContexts={boundedContexts}
        />
      )}

      {draftSource && (() => {
        const c = boundedContextCenter(draftSource);
        return (
          <line
            x1={c.x}
            y1={c.y}
            x2={c.x + 40}
            y2={c.y - 40}
            stroke="#e9c46a"
            strokeWidth={2}
            strokeDasharray="4 3"
            markerEnd="url(#ctx-arrow-draft)"
          />
        );
      })()}
    </svg>
  );
}
