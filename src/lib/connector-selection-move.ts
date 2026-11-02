import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

function endpointInMoveSet(
  ep: ConnectorEndpoint,
  movedIds: ReadonlySet<string>,
): boolean {
  switch (ep.attach) {
    case "element":
    case "swimlane":
    case "boundedContext":
      return movedIds.has(ep.id);
    case "point":
      return false;
    default:
      return false;
  }
}

/** Connector moves rigidly when both attached endpoints are in the same drag batch. */
export function connectorRigidWithMoveSet(
  connector: BoardConnector,
  movedIds: ReadonlySet<string>,
): boolean {
  if (connector.source.attach === "point" || connector.target.attach === "point") {
    return false;
  }
  return (
    endpointInMoveSet(connector.source, movedIds) &&
    endpointInMoveSet(connector.target, movedIds)
  );
}

export function translateConnectorWaypoints(
  connector: BoardConnector,
  dx: number,
  dy: number,
): BoardConnector {
  if (!connector.waypoints?.length) return connector;
  return {
    ...connector,
    waypoints: connector.waypoints.map((wp) => ({ x: wp.x + dx, y: wp.y + dy })),
  };
}

export function translateConnectorsForMoveSet(
  connectors: readonly BoardConnector[],
  movedIds: ReadonlySet<string>,
  dx: number,
  dy: number,
): BoardConnector[] {
  if (dx === 0 && dy === 0) return connectors as BoardConnector[];
  return connectors.map((c) =>
    connectorRigidWithMoveSet(c, movedIds)
      ? translateConnectorWaypoints(c, dx, dy)
      : c,
  );
}

export function inferCanvasSelectionMoveDelta(
  elements: readonly StormElement[],
  swimlanes: readonly Swimlane[],
  boundedContexts: readonly BoundedContext[],
  updates: {
    elements?: ReadonlyArray<{ id: string; x: number; y: number }>;
    swimlanes?: ReadonlyArray<{ id: string; x: number; y: number }>;
    boundedContexts?: ReadonlyArray<{ id: string; x: number; y: number }>;
  },
): { dx: number; dy: number } | null {
  const eu = updates.elements?.[0];
  if (eu) {
    const el = elements.find((e) => e.id === eu.id);
    if (el) return { dx: eu.x - el.x, dy: eu.y - el.y };
  }
  const su = updates.swimlanes?.[0];
  if (su) {
    const lane = swimlanes.find((l) => l.id === su.id);
    if (lane) return { dx: su.x - (lane.x ?? 0), dy: su.y - lane.y };
  }
  const bu = updates.boundedContexts?.[0];
  if (bu) {
    const bc = boundedContexts.find((b) => b.id === bu.id);
    if (bc) return { dx: bu.x - bc.x, dy: bu.y - bc.y };
  }
  return null;
}
