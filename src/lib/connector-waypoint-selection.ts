import type { BoardConnector } from "@/types/board-connector";

import type { WorldRect } from "@/lib/selection-geometry";
import { rectContainedIn } from "@/lib/selection-geometry";

/** Visible hit target for a bend node (matches board-connectors handle rect). */
export const CONNECTOR_WAYPOINT_HANDLE_SIZE = 10;
const HALF = CONNECTOR_WAYPOINT_HANDLE_SIZE / 2;

export type ConnectorWaypointRef = { connectorId: string; index: number };

export function connectorWaypointKey(ref: ConnectorWaypointRef): string {
  return `${ref.connectorId}:${ref.index}`;
}

export function parseConnectorWaypointKey(key: string): ConnectorWaypointRef | null {
  const sep = key.lastIndexOf(":");
  if (sep <= 0) return null;
  const connectorId = key.slice(0, sep);
  const index = Number(key.slice(sep + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { connectorId, index };
}

export function waypointHandleBounds(x: number, y: number): WorldRect {
  return { x: x - HALF, y: y - HALF, w: CONNECTOR_WAYPOINT_HANDLE_SIZE, h: CONNECTOR_WAYPOINT_HANDLE_SIZE };
}

export function connectorWaypointsInMarquee(
  connectors: readonly BoardConnector[],
  marquee: WorldRect,
): ConnectorWaypointRef[] {
  if (marquee.w <= 0 || marquee.h <= 0) return [];
  const out: ConnectorWaypointRef[] = [];
  for (const conn of connectors) {
    const wps = conn.waypoints;
    if (!wps?.length) continue;
    wps.forEach((wp, index) => {
      if (rectContainedIn(waypointHandleBounds(wp.x, wp.y), marquee)) {
        out.push({ connectorId: conn.id, index });
      }
    });
  }
  return out;
}

export function connectorTouchesElementIds(
  conn: BoardConnector,
  elementIds: ReadonlySet<string>,
): boolean {
  return (
    (conn.source.attach === "element" && elementIds.has(conn.source.id)) ||
    (conn.target.attach === "element" && elementIds.has(conn.target.id))
  );
}

function translatePointEndpoint(
  endpoint: BoardConnector["source"],
  dx: number,
  dy: number,
): BoardConnector["source"] {
  if (endpoint.attach !== "point") return endpoint;
  return { ...endpoint, x: endpoint.x + dx, y: endpoint.y + dy };
}

/** Shift bend nodes (and free endpoints) when the selection moves on the canvas. */
export function translateConnectorForCanvasMove(
  conn: BoardConnector,
  dx: number,
  dy: number,
  movedElementIds: ReadonlySet<string>,
  selectedWaypointKeys: ReadonlySet<string>,
): BoardConnector {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return conn;

  const touchesElements = connectorTouchesElementIds(conn, movedElementIds);
  let waypoints = conn.waypoints;
  if (waypoints?.length) {
    waypoints = waypoints.map((wp, index) => {
      const key = connectorWaypointKey({ connectorId: conn.id, index });
      if (selectedWaypointKeys.has(key) || touchesElements) {
        return { x: wp.x + dx, y: wp.y + dy };
      }
      return wp;
    });
  }

  let source = conn.source;
  let target = conn.target;
  if (touchesElements) {
    source = translatePointEndpoint(source, dx, dy);
    target = translatePointEndpoint(target, dx, dy);
  }

  if (
    waypoints === conn.waypoints &&
    source === conn.source &&
    target === conn.target
  ) {
    return conn;
  }
  return { ...conn, source, target, waypoints };
}

export function mergeWaypointSelection(
  current: readonly ConnectorWaypointRef[],
  next: readonly ConnectorWaypointRef[],
  additive: boolean,
): ConnectorWaypointRef[] {
  if (!additive) return [...next];
  const byKey = new Map(current.map((r) => [connectorWaypointKey(r), r]));
  for (const r of next) byKey.set(connectorWaypointKey(r), r);
  return Array.from(byKey.values());
}

export function isWaypointSelected(
  selected: readonly ConnectorWaypointRef[],
  connectorId: string,
  index: number,
): boolean {
  return selected.some((r) => r.connectorId === connectorId && r.index === index);
}
