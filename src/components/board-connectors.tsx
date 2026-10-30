"use client";

import { useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import { ConnectorSnapTargetHighlight } from "@/components/connector-snap-highlight";
import {
  attachTargetToEndpoint,
  connectorEndpointCenter,
  resolveConnectorAnchors,
  connectorEndpointTowardPoint,
} from "@/lib/board-connector-resolve";
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
} from "@/lib/connector-endpoint-drag";
import {
  connectorEndpointDragPreview,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import { screenToWorld } from "@/lib/canvas-viewport";
import {
  insertConnectorWaypoint,
  polylineCaptionAnchor,
  polylinePointsAttr,
  projectPointOnSegment,
  removeConnectorWaypoint,
  resolveConnectorPolylinePoints,
  updateConnectorWaypoint,
} from "@/lib/connector-polyline";
import { connectorHitStrokeWidth } from "@/lib/connector-style";
import { connectorDimmedBySelectionFilter } from "@/lib/canvas-selection-filter";
import { connectorDimmedByTypeVisibilityFilter } from "@/lib/canvas-type-visibility-filter";
import { matchElementSearch, normalizeSearchQuery } from "@/lib/element-search";
import { ProgressMarkConnectorBadge } from "@/components/progress-mark-badge";
import { useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { BoardConnector } from "@/types/board-connector";
import type { StormElement } from "@/types/storm-element";

const SNAP_ACCEPT: ConnectorAttachTarget["kind"][] = [
  "element",
  "boundedContext",
  "swimlane",
];

/** Stay under cards (cssStackingZIndex base ≥ 20) so lines never paint through stickies. */
const CONNECTOR_LAYER_Z = 10;
/** Draft fan sits above normal cards; no hit testing. */
const CONNECTOR_FAN_Z = 9_500;
/** Endpoint handles above elevated stickies so they stay grabbable. */
const CONNECTOR_HANDLE_Z = 100_010;

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
  const t = useT();
  const connectors = useStormBoardStore((s) => s.connectors);
  const selectedConnectorId = useStormBoardStore((s) => s.selectedConnectorId);
  const selectConnector = useStormBoardStore((s) => s.selectConnector);
  const updateConnector = useStormBoardStore((s) => s.updateConnector);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const searchQuery = useStormBoardStore((s) => s.searchQuery);
  const selectionFilterEnabled = useStormBoardStore((s) => s.selectionFilterEnabled);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const hiddenElementTypes = useStormBoardStore((s) => s.hiddenElementTypes);
  const hiddenCustomTypeIds = useStormBoardStore((s) => s.hiddenCustomTypeIds);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const viewport = useStormBoardStore((s) => s.viewport);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const relationMode = useStormBoardStore((s) => s.relationMode);
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
  const [waypointDrag, setWaypointDrag] = useState<{
    connectorId: string;
    index: number;
    point: { x: number; y: number };
  } | null>(null);

  const canvasContainerRect = () =>
    document.querySelector("[data-storm-canvas]")?.getBoundingClientRect() ?? null;

  const startEndpointDrag = (
    connector: BoardConnector,
    side: "source" | "target",
    towardCenter: { x: number; y: number },
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
      lineEnd: towardCenter,
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
          towardCenter,
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
          towardCenter,
          live.elements,
          live.swimlanes,
          live.boundedContexts,
          SNAP_ACCEPT,
        );
        if (preview.valid && preview.target) {
          live.reconnectConnector(connector.id, side, attachTargetToEndpoint(preview.target));
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

  const addBendOnSegment = (
    conn: BoardConnector,
    segmentIndex: number,
    clientX: number,
    clientY: number,
  ) => {
    if (relationMode) return;
    const rect = canvasContainerRect();
    if (!rect) return;
    const world = screenToWorld(viewport, clientX, clientY, rect);
    const points = resolveConnectorPolylinePoints(conn, elements, swimlanes, boundedContexts);
    const a = points[segmentIndex];
    const b = points[segmentIndex + 1];
    if (!a || !b) return;
    const { point } = projectPointOnSegment(world, a, b);
    updateConnector(conn.id, {
      waypoints: insertConnectorWaypoint(conn.waypoints, segmentIndex, point),
    });
  };

  const startWaypointDrag = (
    conn: BoardConnector,
    index: number,
    e: ReactPointerEvent,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectConnector(conn.id);
    const store = useStormBoardStore.getState();
    store.beginGesture();
    setWaypointDrag({
      connectorId: conn.id,
      index,
      point: conn.waypoints?.[index] ?? { x: 0, y: 0 },
    });
    beginConnectorEndpointDrag({
      zoom,
      viewport,
      getContainerRect: canvasContainerRect,
      onMove: (world) => {
        setWaypointDrag({ connectorId: conn.id, index, point: world });
      },
      onCommit: (world) => {
        updateConnector(conn.id, {
          waypoints: updateConnectorWaypoint(conn.waypoints, index, world),
        });
        setWaypointDrag(null);
        store.endGesture();
      },
      onCancel: () => {
        setWaypointDrag(null);
        store.endGesture();
      },
    });
  };

  const removeBend = (conn: BoardConnector, index: number) => {
    updateConnector(conn.id, { waypoints: removeConnectorWaypoint(conn.waypoints, index) });
  };

  const elementInvolved = (c: BoardConnector, elId: string) =>
    (c.source.attach === "element" && c.source.id === elId) ||
    (c.target.attach === "element" && c.target.id === elId);

  const showFan = Boolean(relationMode && connectorDraftSource);
  const selectedConn = selectedConnectorId
    ? connectors.find((c) => c.id === selectedConnectorId)
    : undefined;

  const fanLines =
    showFan && connectorDraftSource
      ? elements
          .filter(
            (el) =>
              !(
                connectorDraftSource.attach === "element" &&
                connectorDraftSource.id === el.id
              ),
          )
          .map((el) => {
            const targetEp = { attach: "element" as const, id: el.id };
            const { start, end } = resolveConnectorAnchors(
              { source: connectorDraftSource, target: targetEp },
              elements,
              swimlanes,
              boundedContexts,
            );
            return { id: el.id, start, end };
          })
      : [];

  const selectedAnchors = selectedConn
    ? resolveConnectorAnchors(selectedConn, elements, swimlanes, boundedContexts)
    : null;
  const draggingSelected =
    endpointDrag && selectedConn && endpointDrag.connectorId === selectedConn.id
      ? endpointDrag
      : null;
  const selectedHandleStart = selectedAnchors
    ? draggingSelected?.endpoint === "source"
      ? draggingSelected.lineEnd
      : selectedAnchors.start
    : null;
  const selectedHandleEnd = selectedAnchors
    ? draggingSelected?.endpoint === "target"
      ? draggingSelected.lineEnd
      : selectedAnchors.end
    : null;

  return (
    <>
      <svg
        data-board-connector
        className="pointer-events-none absolute inset-0 overflow-visible"
        style={{ zIndex: CONNECTOR_LAYER_Z }}
      >
        <defs>
          <marker
            id="board-conn-arrow-end"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill="#8b9aab" />
          </marker>
          <marker
            id="board-conn-arrow-end-selected"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill="#2a9d8f" />
          </marker>
          <marker
            id="board-conn-arrow-start"
            markerWidth="8"
            markerHeight="8"
            refX="1"
            refY="3"
            orient="auto"
          >
            <path d="M8,0 L0,3 L8,6 Z" fill="#8b9aab" />
          </marker>
          <marker
            id="board-conn-arrow-start-selected"
            markerWidth="8"
            markerHeight="8"
            refX="1"
            refY="3"
            orient="auto"
          >
            <path d="M8,0 L0,3 L8,6 Z" fill="#2a9d8f" />
          </marker>
        </defs>

        {connectors.map((conn) => {
          const draggingThis = endpointDrag?.connectorId === conn.id;
          const basePoints = resolveConnectorPolylinePoints(
            conn,
            elements,
            swimlanes,
            boundedContexts,
          );
          let displayPoints = [...basePoints];
          if (draggingThis && endpointDrag) {
            if (endpointDrag.endpoint === "source") {
              displayPoints[0] = endpointDrag.lineEnd;
            } else {
              displayPoints[displayPoints.length - 1] = endpointDrag.lineEnd;
            }
          }
          if (waypointDrag?.connectorId === conn.id && conn.waypoints?.length) {
            const inner = [...conn.waypoints];
            inner[waypointDrag.index] = waypointDrag.point;
            displayPoints = [
              basePoints[0]!,
              ...inner,
              basePoints[basePoints.length - 1]!,
            ];
          }
          const selected = conn.id === selectedConnectorId;
          const dragSnapActive = draggingThis && endpointDrag!.valid;
          const arrow = connectorArrowHead(conn);
          const stroke = boardConnectorStrokeColor(conn, selected && !draggingThis);
          const strokeW = boardConnectorStrokeWidth(conn, selected || draggingThis);
          const dash =
            draggingThis && !dragSnapActive ? "6 4" : boardConnectorStrokeDash(conn);
          const caption = boardConnectorCaption(conn);
          const { mid: captionMid, badgeX, badgeY } = polylineCaptionAnchor(displayPoints);
          const midX = captionMid.x;
          const midY = captionMid.y;
          const pointsAttr = polylinePointsAttr(displayPoints);
          const dimForFocus =
            focusMode &&
            conn.relationType &&
            !elements.some(
              (el) => el.type === paletteType && elementInvolved(conn, el.id),
            );
          const dimForSearch =
            searchHitIds !== null &&
            !elements.some((el) => searchHitIds.has(el.id) && elementInvolved(conn, el.id));
          const dimForSelection = connectorDimmedBySelectionFilter(
            (elementId) => elementInvolved(conn, elementId),
            selectionFilterEnabled,
            selectedElementIds,
          );
          const dimForTypeVisibility = connectorDimmedByTypeVisibilityFilter(
            elements,
            (elementId) => elementInvolved(conn, elementId),
            hiddenElementTypes,
            hiddenCustomTypeIds,
          );
          const dimmed = dimForFocus || dimForSearch || dimForSelection || dimForTypeVisibility;
          const mark = conn.progressMark;
          const strokeColor = draggingThis && !dragSnapActive ? "#e9c46a" : stroke;
          const selectThis = (e: ReactPointerEvent | ReactMouseEvent) => {
            stopCanvasPan(e);
            if (e.type === "pointerdown") {
              if ("button" in e && e.button !== 0) return;
              e.preventDefault();
            }
            selectConnector(conn.id);
          };

          const addBend = (segmentIndex: number, e: ReactMouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            if (relationMode) return;
            selectConnector(conn.id);
            addBendOnSegment(conn, segmentIndex, e.clientX, e.clientY);
          };

          return (
            <g key={conn.id} opacity={dimmed ? 0.22 : 1}>
              {displayPoints.slice(0, -1).map((a, segmentIndex) => {
                const b = displayPoints[segmentIndex + 1]!;
                return (
                  <line
                    key={`hit-${segmentIndex}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="transparent"
                    strokeWidth={hitWidth}
                    strokeLinecap="round"
                    data-board-connector="hit"
                    className="pointer-events-auto cursor-pointer"
                    onPointerDown={selectThis}
                    onClick={selectThis}
                    onDoubleClick={(e) => addBend(segmentIndex, e)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const store = useStormBoardStore.getState();
                      store.selectConnector(conn.id);
                      store.openContextMenu(e.clientX, e.clientY, {
                        kind: "connector",
                        id: conn.id,
                      });
                    }}
                  />
                );
              })}
              {boardConnectorDoubleLine(conn) && (
                <polyline
                  points={pointsAttr}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeW + 4}
                  strokeOpacity={0.25}
                  className="pointer-events-none"
                />
              )}
              <polyline
                points={pointsAttr}
                fill="none"
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
                <g className="pointer-events-none">
                  <rect
                    x={midX - caption.length * 2.6 - 4}
                    y={midY - 18}
                    width={caption.length * 5.2 + 8}
                    height={14}
                    rx={3}
                    fill="var(--panel-solid, #1a2332)"
                    fillOpacity={0.85}
                  />
                  <text
                    x={midX}
                    y={midY - 8}
                    textAnchor="middle"
                    className="fill-[var(--muted)] text-[10px]"
                  >
                    {caption}
                  </text>
                </g>
              ) : null}
              {mark && (
                <g transform={`translate(${badgeX}, ${badgeY})`}>
                  <ProgressMarkConnectorBadge mark={mark} />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {fanLines.length > 0 && (
        <svg
          data-board-connector-fan
          className="pointer-events-none absolute inset-0 overflow-visible"
          style={{ zIndex: CONNECTOR_FAN_Z }}
        >
          <defs>
            <marker
              id="board-conn-arrow-draft"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6 Z" fill="#e9c46a" />
            </marker>
          </defs>
          {fanLines.map(({ id, start, end }) => (
            <line
              key={`connector-draft-fan-${id}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#e9c46a"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.45}
              markerEnd="url(#board-conn-arrow-draft)"
            />
          ))}
        </svg>
      )}

      {selectedConn && selectedHandleStart && selectedHandleEnd && selectedAnchors && (
        <svg
          data-board-connector-handles
          className="pointer-events-none absolute inset-0 overflow-visible"
          style={{ zIndex: CONNECTOR_HANDLE_Z }}
        >
          {endpointDrag?.target && (
            <ConnectorSnapTargetHighlight
              target={endpointDrag.target}
              valid={endpointDrag.valid}
              elements={elements}
              swimlanes={swimlanes}
              boundedContexts={boundedContexts}
            />
          )}
          <circle
            data-board-connector="endpoint"
            cx={selectedHandleStart.x}
            cy={selectedHandleStart.y}
            r={connectorEndpointHandleRadius(true)}
            fill="#fff"
            stroke="#2a9d8f"
            strokeWidth={2}
            className="pointer-events-auto cursor-grab"
            onPointerDown={(e) =>
              startEndpointDrag(
                selectedConn,
                "source",
                connectorEndpointTowardPoint(
                  selectedConn,
                  "source",
                  elements,
                  swimlanes,
                  boundedContexts,
                ),
                e,
              )
            }
          />
          <circle
            data-board-connector="endpoint"
            cx={selectedHandleEnd.x}
            cy={selectedHandleEnd.y}
            r={connectorEndpointHandleRadius(true)}
            fill="#fff"
            stroke="#2a9d8f"
            strokeWidth={2}
            className="pointer-events-auto cursor-grab"
            onPointerDown={(e) =>
              startEndpointDrag(
                selectedConn,
                "target",
                connectorEndpointTowardPoint(
                  selectedConn,
                  "target",
                  elements,
                  swimlanes,
                  boundedContexts,
                ),
                e,
              )
            }
          />
          {(selectedConn.waypoints ?? []).map((wp, index) => {
            const display =
              waypointDrag?.connectorId === selectedConn.id && waypointDrag.index === index
                ? waypointDrag.point
                : wp;
            return (
              <rect
                key={`wp-${selectedConn.id}-${index}`}
                data-board-connector="waypoint"
                x={display.x - 5}
                y={display.y - 5}
                width={10}
                height={10}
                rx={2}
                fill="#fff"
                stroke="#2a9d8f"
                strokeWidth={2}
                className="pointer-events-auto cursor-grab"
                onPointerDown={(e) => startWaypointDrag(selectedConn, index, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  removeBend(selectedConn, index);
                }}
              >
                <title>{t("contextMenu.connectorRemoveBendHint")}</title>
              </rect>
            );
          })}
        </svg>
      )}
    </>
  );
}
