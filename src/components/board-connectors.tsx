"use client";

import { useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import { ConnectorSnapTargetHighlight } from "@/components/connector-snap-highlight";
import {
  attachTargetToEndpoint,
  resolveConnectorAnchors,
} from "@/lib/board-connector-resolve";
import { elementCenter } from "@/lib/connector-geometry";
import {
  boardConnectorCaption,
  boardConnectorDoubleLine,
  boardConnectorStrokeColor,
  boardConnectorStrokeDash,
  boardConnectorStrokeWidth,
  connectorArrowHead,
} from "@/lib/board-connector-style";
import {
  beginConnectorEndpointDrag,
  connectorEndpointHandleRadius,
  type ConnectorEndpoint,
} from "@/lib/connector-endpoint-drag";
import {
  connectorEndpointDragPreview,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import { connectorHitStrokeWidth } from "@/lib/connector-style";
import { matchElementSearch, normalizeSearchQuery } from "@/lib/element-search";
import { ProgressMarkConnectorBadge } from "@/components/progress-mark-badge";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { BoardConnector } from "@/types/board-connector";
import type { StormElement } from "@/types/storm-element";

const SNAP_ACCEPT: ConnectorAttachTarget["kind"][] = [
  "element",
  "boundedContext",
  "swimlane",
];

function stopCanvasPan(e: ReactPointerEvent | ReactMouseEvent) {
  e.stopPropagation();
}

function markerEndId(selected: boolean): string {
  return selected ? "board-conn-arrow-end-selected" : "board-conn-arrow-end";
}

function markerStartId(selected: boolean): string {
  return selected ? "board-conn-arrow-start-selected" : "board-conn-arrow-start";
}

export interface BoardConnectorsProps {
  elements: StormElement[];
  connectorDraftSource?: import("@/types/board-connector").ConnectorEndpoint | null;
}

export function BoardConnectors({ elements, connectorDraftSource }: BoardConnectorsProps) {
  const connectors = useStormBoardStore((s) => s.connectors);
  const selectedConnectorId = useStormBoardStore((s) => s.selectedConnectorId);
  const selectConnector = useStormBoardStore((s) => s.selectConnector);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const searchQuery = useStormBoardStore((s) => s.searchQuery);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const viewport = useStormBoardStore((s) => s.viewport);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
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
  const [endpointDrag, setEndpointDrag] = useState<{
    connectorId: string;
    endpoint: "source" | "target";
    lineEnd: { x: number; y: number };
    target: ConnectorAttachTarget | null;
    valid: boolean;
  } | null>(null);

  const canvasContainerRect = () =>
    document.querySelector("[data-storm-canvas]")?.getBoundingClientRect() ?? null;

  const startEndpointDrag = (
    connector: BoardConnector,
    side: "source" | "target",
    fixed: { x: number; y: number },
    e: ReactPointerEvent,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectConnector(connector.id);
    const store = useStormBoardStore.getState();
    store.beginGesture();
    setEndpointDrag({
      connectorId: connector.id,
      endpoint: side,
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
          SNAP_ACCEPT,
        );
        setEndpointDrag({
          connectorId: connector.id,
          endpoint: side,
          ...preview,
        });
      },
      onCommit: (world) => {
        const live = useStormBoardStore.getState();
        const preview = connectorEndpointDragPreview(
          world,
          fixed,
          live.elements,
          live.swimlanes,
          live.boundedContexts,
          SNAP_ACCEPT,
        );
        if (preview.valid && preview.target) {
          live.reconnectConnector(
            connector.id,
            side,
            attachTargetToEndpoint(preview.target, world),
          );
        } else {
          live.reconnectConnector(connector.id, side, {
            attach: "point",
            x: world.x,
            y: world.y,
          });
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

  const elementInvolved = (c: BoardConnector, elId: string) =>
    (c.source.attach === "element" && c.source.id === elId) ||
    (c.target.attach === "element" && c.target.id === elId);

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 10 }}>
      <defs>
        <marker id="board-conn-arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#8b9aab" />
        </marker>
        <marker id="board-conn-arrow-end-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#2a9d8f" />
        </marker>
        <marker id="board-conn-arrow-start" markerWidth="8" markerHeight="8" refX="1" refY="3" orient="auto">
          <path d="M8,0 L0,3 L8,6 Z" fill="#8b9aab" />
        </marker>
        <marker id="board-conn-arrow-start-selected" markerWidth="8" markerHeight="8" refX="1" refY="3" orient="auto">
          <path d="M8,0 L0,3 L8,6 Z" fill="#2a9d8f" />
        </marker>
      </defs>

      {endpointDrag?.target && (
        <ConnectorSnapTargetHighlight
          target={endpointDrag.target}
          valid={endpointDrag.valid}
          elements={elements}
          swimlanes={swimlanes}
          boundedContexts={boundedContexts}
        />
      )}

      {connectors.map((conn) => {
        const { start, end } = resolveConnectorAnchors(
          conn,
          elements,
          swimlanes,
          boundedContexts,
        );
        const draggingThis = endpointDrag?.connectorId === conn.id;
        const displayStart =
          draggingThis && endpointDrag.endpoint === "source" ? endpointDrag.lineEnd : start;
        const displayEnd =
          draggingThis && endpointDrag.endpoint === "target" ? endpointDrag.lineEnd : end;
        const selected = conn.id === selectedConnectorId;
        const dragSnapActive = draggingThis && endpointDrag.valid;
        const arrow = connectorArrowHead(conn);
        const stroke = boardConnectorStrokeColor(conn, selected && !draggingThis);
        const strokeW = boardConnectorStrokeWidth(conn, selected || draggingThis);
        const dash =
          draggingThis && !dragSnapActive ? "6 4" : boardConnectorStrokeDash(conn);
        const caption = boardConnectorCaption(conn);
        const midX = (displayStart.x + displayEnd.x) / 2;
        const midY = (displayStart.y + displayEnd.y) / 2;
        const dx = displayEnd.x - displayStart.x;
        const dy = displayEnd.y - displayStart.y;
        const len = Math.hypot(dx, dy) || 1;
        const badgeX = midX + (-dy / len) * 14;
        const badgeY = midY + (dx / len) * 14;
        const dimForFocus =
          focusMode &&
          conn.relationType &&
          !elements.some(
            (el) =>
              el.type === paletteType && elementInvolved(conn, el.id),
          );
        const dimForSearch =
          searchHitIds !== null &&
          !elements.some((el) => searchHitIds.has(el.id) && elementInvolved(conn, el.id));
        const dimmed = dimForFocus || dimForSearch;
        const mark = conn.progressMark;
        const strokeColor =
          draggingThis && !dragSnapActive ? "#e9c46a" : stroke;
        const handleR = connectorEndpointHandleRadius(selected);

        const selectThis = (e: ReactPointerEvent | ReactMouseEvent) => {
          stopCanvasPan(e);
          if (e.type === "pointerdown") {
            if ("button" in e && e.button !== 0) return;
            e.preventDefault();
          }
          selectConnector(conn.id);
        };

        return (
          <g key={conn.id} opacity={dimmed ? 0.22 : 1}>
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
                store.selectConnector(conn.id);
                const kind = conn.relationType
                  ? "relation"
                  : conn.contextMapPattern
                    ? "contextRelation"
                    : "relation";
                store.openContextMenu(e.clientX, e.clientY, { kind, id: conn.id });
              }}
            />
            {boardConnectorDoubleLine(conn) && (
              <line
                x1={displayStart.x}
                y1={displayStart.y}
                x2={displayEnd.x}
                y2={displayEnd.y}
                stroke={strokeColor}
                strokeWidth={strokeW + 4}
                strokeOpacity={0.25}
                className="pointer-events-none"
              />
            )}
            <line
              x1={displayStart.x}
              y1={displayStart.y}
              x2={displayEnd.x}
              y2={displayEnd.y}
              stroke={strokeColor}
              strokeWidth={strokeW}
              strokeDasharray={dash}
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
                  onPointerDown={(e) => startEndpointDrag(conn, "source", end, e)}
                />
                <circle
                  cx={end.x}
                  cy={end.y}
                  r={handleR}
                  fill="#fff"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                  className="pointer-events-auto cursor-grab"
                  onPointerDown={(e) => startEndpointDrag(conn, "target", start, e)}
                />
              </>
            )}
          </g>
        );
      })}

      {connectorDraftSource && (
        <g opacity={0.45}>
          {elements
            .filter((el) => {
              if (connectorDraftSource.attach !== "element") return true;
              return el.id !== connectorDraftSource.id;
            })
            .map((el) => {
              const draftStart = resolveConnectorAnchors(
                { source: connectorDraftSource, target: { attach: "point", x: el.x, y: el.y } },
                elements,
                swimlanes,
                boundedContexts,
              ).start;
              const end = elementCenter(el);
              return (
                <line
                  key={`draft-hint-${el.id}`}
                  x1={draftStart.x}
                  y1={draftStart.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#e9c46a"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              );
            })}
        </g>
      )}
    </svg>
  );
}
