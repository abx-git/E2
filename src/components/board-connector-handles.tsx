"use client";

import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { ConnectorSnapTargetHighlight } from "@/components/connector-snap-highlight";
import {
  attachTargetToEndpoint,
  connectorEndpointApproachFrom,
  connectorEndpointTowardPoint,
  resolveConnectorAnchors,
} from "@/lib/board-connector-resolve";
import {
  beginConnectorEndpointDrag,
  connectorEndpointHandleRadius,
} from "@/lib/connector-endpoint-drag";
import {
  connectorEndpointDragPreview,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import {
  CONNECTOR_WAYPOINT_HANDLE_SIZE,
  connectorWaypointKey,
  isWaypointSelected,
  type ConnectorWaypointRef,
} from "@/lib/connector-waypoint-selection";
import {
  removeConnectorWaypoint,
} from "@/lib/connector-polyline";
import { useT } from "@/i18n";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { BoardConnector } from "@/types/board-connector";
import type { StormElement } from "@/types/storm-element";

const SNAP_ACCEPT: ConnectorAttachTarget["kind"][] = [
  "element",
  "boundedContext",
  "swimlane",
];

const CONNECTOR_HANDLE_Z = 100_010;
const HALF = CONNECTOR_WAYPOINT_HANDLE_SIZE / 2;

export interface BoardConnectorHandlesProps {
  elements: StormElement[];
}

export function BoardConnectorHandles({ elements }: BoardConnectorHandlesProps) {
  const t = useT();
  const connectors = useStormBoardStore((s) => s.connectors);
  const selectedConnectorId = useStormBoardStore((s) => s.selectedConnectorId);
  const selectedConnectorWaypoints = useStormBoardStore((s) => s.selectedConnectorWaypoints);
  const selectConnector = useStormBoardStore((s) => s.selectConnector);
  const selectConnectorWaypoint = useStormBoardStore((s) => s.selectConnectorWaypoint);
  const updateConnector = useStormBoardStore((s) => s.updateConnector);
  const translateConnectorWaypointsByKeys = useStormBoardStore(
    (s) => s.translateConnectorWaypointsByKeys,
  );
  const setConnectorWaypointDrag = useStormBoardStore((s) => s.setConnectorWaypointDrag);
  const setConnectorEndpointDrag = useStormBoardStore((s) => s.setConnectorEndpointDrag);
  const zoom = useStormBoardStore((s) => s.viewport.zoom);
  const viewport = useStormBoardStore((s) => s.viewport);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const endpointDragPreview = useStormBoardStore((s) => s.connectorEndpointDrag);
  const waypointDragPreview = useStormBoardStore((s) => s.connectorWaypointDrag);

  const selectedConn = selectedConnectorId
    ? connectors.find((c) => c.id === selectedConnectorId)
    : undefined;

  const showHandles = Boolean(selectedConn);

  const [endpointSnap, setEndpointSnap] = useState<{
    target: ConnectorAttachTarget | null;
    valid: boolean;
  } | null>(null);

  const canvasContainerRect = () =>
    document.querySelector("[data-storm-canvas]")?.getBoundingClientRect() ?? null;

  const startEndpointDrag = (
    connector: BoardConnector,
    side: "source" | "target",
    towardCenter: { x: number; y: number },
    approachFrom: { x: number; y: number } | undefined,
    e: ReactPointerEvent,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectConnector(connector.id);
    const store = useStormBoardStore.getState();
    store.beginGesture();
    setConnectorEndpointDrag({
      connectorId: connector.id,
      endpoint: side,
      lineEnd: towardCenter,
      valid: false,
    });
    setEndpointSnap(null);

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
          approachFrom,
        );
        setConnectorEndpointDrag({
          connectorId: connector.id,
          endpoint: side,
          lineEnd: preview.lineEnd,
          valid: preview.valid,
        });
        setEndpointSnap({ target: preview.target, valid: preview.valid });
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
          approachFrom,
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
        setConnectorEndpointDrag(null);
        setEndpointSnap(null);
        live.endGesture();
      },
      onCancel: () => {
        setConnectorEndpointDrag(null);
        setEndpointSnap(null);
        useStormBoardStore.getState().endGesture();
      },
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
    const ref: ConnectorWaypointRef = { connectorId: conn.id, index };
    if (e.shiftKey) {
      selectConnectorWaypoint(ref, true);
    } else if (!isWaypointSelected(selectedConnectorWaypoints, conn.id, index)) {
      selectConnectorWaypoint(ref, false);
    } else {
      selectConnector(conn.id);
    }

    const live = useStormBoardStore.getState();
    const keys =
      live.selectedConnectorWaypoints.length > 0
        ? live.selectedConnectorWaypoints.map((r) => connectorWaypointKey(r))
        : [connectorWaypointKey(ref)];
    const origin = conn.waypoints?.[index] ?? { x: 0, y: 0 };

    live.beginGesture();
    setConnectorWaypointDrag({
      anchorConnectorId: conn.id,
      anchorStart: { ...origin },
      point: { ...origin },
      selectedKeys: keys,
    });

    beginConnectorEndpointDrag({
      zoom,
      viewport,
      getContainerRect: canvasContainerRect,
      onMove: (world) => {
        setConnectorWaypointDrag({
          anchorConnectorId: conn.id,
          anchorStart: { ...origin },
          point: world,
          selectedKeys: keys,
        });
      },
      onCommit: (world) => {
        const dx = world.x - origin.x;
        const dy = world.y - origin.y;
        translateConnectorWaypointsByKeys(dx, dy, keys);
        setConnectorWaypointDrag(null);
        useStormBoardStore.getState().endGesture();
      },
      onCancel: () => {
        setConnectorWaypointDrag(null);
        useStormBoardStore.getState().endGesture();
      },
    });
  };

  if (!showHandles || !selectedConn) return null;

  const selectedAnchors = resolveConnectorAnchors(
    selectedConn,
    elements,
    swimlanes,
    boundedContexts,
  );
  const draggingSelected =
    endpointDragPreview && endpointDragPreview.connectorId === selectedConn.id
      ? endpointDragPreview
      : null;
  const selectedHandleStart = draggingSelected?.endpoint === "source"
    ? draggingSelected.lineEnd
    : selectedAnchors.start;
  const selectedHandleEnd = draggingSelected?.endpoint === "target"
    ? draggingSelected.lineEnd
    : selectedAnchors.end;

  return (
    <svg
      data-board-connector-handles
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: CONNECTOR_HANDLE_Z }}
    >
      {endpointSnap?.target && (
        <ConnectorSnapTargetHighlight
          target={endpointSnap.target}
          valid={endpointSnap.valid}
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
            connectorEndpointApproachFrom(selectedConn, "source"),
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
            connectorEndpointApproachFrom(selectedConn, "target"),
            e,
          )
        }
      />
      {(selectedConn.waypoints ?? []).map((wp, index) => {
        const selected = isWaypointSelected(selectedConnectorWaypoints, selectedConn.id, index);
        const display =
          waypointDragPreview &&
          waypointDragPreview.selectedKeys.includes(
            connectorWaypointKey({ connectorId: selectedConn.id, index }),
          )
            ? {
                x:
                  wp.x +
                  (waypointDragPreview.point.x - waypointDragPreview.anchorStart.x),
                y:
                  wp.y +
                  (waypointDragPreview.point.y - waypointDragPreview.anchorStart.y),
              }
            : wp;
        return (
          <rect
            key={`wp-${selectedConn.id}-${index}`}
            data-board-connector="waypoint"
            x={display.x - HALF}
            y={display.y - HALF}
            width={CONNECTOR_WAYPOINT_HANDLE_SIZE}
            height={CONNECTOR_WAYPOINT_HANDLE_SIZE}
            rx={2}
            fill={selected ? "#2a9d8f" : "#fff"}
            stroke="#2a9d8f"
            strokeWidth={selected ? 2.5 : 2}
            className="pointer-events-auto cursor-grab"
            onPointerDown={(e) => startWaypointDrag(selectedConn, index, e)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              updateConnector(selectedConn.id, {
                waypoints: removeConnectorWaypoint(selectedConn.waypoints, index),
              });
              useStormBoardStore.setState((s) => ({
                selectedConnectorWaypoints: s.selectedConnectorWaypoints.filter(
                  (r) => r.connectorId !== selectedConn.id || r.index !== index,
                ),
              }));
            }}
          >
            <title>{t("contextMenu.connectorRemoveBendHint")}</title>
          </rect>
        );
      })}
    </svg>
  );
}
