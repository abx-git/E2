import { rectAnchorToward, rectCenter, rectBorderHitFromRay, type Point } from "@/lib/connector-geometry";
import {
  boundsForConnectorTarget,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import type { ConnectorApproach, ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

/** Attach to a shape by id only — anchors always resolve center→edge. */
export function attachTargetToEndpoint(target: ConnectorAttachTarget): ConnectorEndpoint {
  if (target.kind === "element") return { attach: "element", id: target.id };
  if (target.kind === "boundedContext") return { attach: "boundedContext", id: target.id };
  return { attach: "swimlane", id: target.id };
}

/** @deprecated Prefer attachTargetToEndpoint; approach is ignored when resolving anchors. */
export function withConnectorApproach(
  endpoint: ConnectorEndpoint,
  approach?: ConnectorApproach,
): ConnectorEndpoint {
  if (endpoint.attach === "point" || !approach) return endpoint;
  return { ...endpoint, approach };
}

/** Drop stale approach points so connectors stay center→edge. */
export function stripConnectorApproach(endpoint: ConnectorEndpoint): ConnectorEndpoint {
  if (endpoint.attach === "point") return endpoint;
  if (endpoint.attach === "element") return { attach: "element", id: endpoint.id };
  if (endpoint.attach === "boundedContext") {
    return { attach: "boundedContext", id: endpoint.id };
  }
  return { attach: "swimlane", id: endpoint.id };
}

export function connectorEndpointToAttachTarget(
  endpoint: ConnectorEndpoint,
): ConnectorAttachTarget | null {
  if (endpoint.attach === "element") return { kind: "element", id: endpoint.id };
  if (endpoint.attach === "boundedContext") return { kind: "boundedContext", id: endpoint.id };
  if (endpoint.attach === "swimlane") return { kind: "swimlane", id: endpoint.id };
  return null;
}

export function connectorEndpointCenter(
  endpoint: ConnectorEndpoint,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): Point | null {
  if (endpoint.attach === "point") {
    return { x: endpoint.x, y: endpoint.y };
  }
  const attach = connectorEndpointToAttachTarget(endpoint);
  if (!attach) return null;
  const bounds = boundsForConnectorTarget(attach, elements, swimlanes, boundedContexts);
  if (!bounds) return null;
  return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
}

/**
 * World point where a connector meets this endpoint.
 * Without waypoints, shape attachments aim from the shape center toward `toward`
 * (typically the opposite element center). With `approachFrom`, the edge is where
 * the ray from that polyline neighbor (e.g. last waypoint) meets the shape — so
 * the dock aligns with the incoming/outgoing segment, not center→opposite-center.
 */
export function resolveConnectorEndpointPoint(
  endpoint: ConnectorEndpoint,
  toward: Point,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  approachFrom?: Point,
): Point {
  if (endpoint.attach === "point") {
    return { x: endpoint.x, y: endpoint.y };
  }
  const attach = connectorEndpointToAttachTarget(endpoint);
  if (!attach) return toward;
  const bounds = boundsForConnectorTarget(attach, elements, swimlanes, boundedContexts);
  if (!bounds) return toward;
  const rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
  if (approachFrom) {
    return rectBorderHitFromRay(rect, approachFrom, rectCenter(rect));
  }
  return rectAnchorToward(rect, toward);
}

export function resolveConnectorAnchors(
  connector: {
    source: ConnectorEndpoint;
    target: ConnectorEndpoint;
    waypoints?: readonly { x: number; y: number }[];
  },
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): { start: Point; end: Point } {
  const waypoints = connector.waypoints ?? [];
  const targetCenter =
    connectorEndpointCenter(connector.target, elements, swimlanes, boundedContexts) ??
    (connector.target.attach === "point"
      ? { x: connector.target.x, y: connector.target.y }
      : { x: 0, y: 0 });
  const sourceCenter =
    connectorEndpointCenter(connector.source, elements, swimlanes, boundedContexts) ??
    (connector.source.attach === "point"
      ? { x: connector.source.x, y: connector.source.y }
      : { x: 0, y: 0 });

  const lastWaypoint = waypoints.length > 0 ? waypoints[waypoints.length - 1]! : undefined;
  const firstWaypoint = waypoints.length > 0 ? waypoints[0]! : undefined;

  const end = resolveConnectorEndpointPoint(
    connector.target,
    sourceCenter,
    elements,
    swimlanes,
    boundedContexts,
    lastWaypoint,
  );
  const start = resolveConnectorEndpointPoint(
    connector.source,
    targetCenter,
    elements,
    swimlanes,
    boundedContexts,
    firstWaypoint,
  );
  return { start, end };
}

/** Polyline neighbor used to pick the shape edge (waypoint side of the bend). */
export function connectorEndpointApproachFrom(
  connector: {
    waypoints?: readonly { x: number; y: number }[];
  },
  side: "source" | "target",
): Point | undefined {
  const waypoints = connector.waypoints ?? [];
  if (!waypoints.length) return undefined;
  return side === "source" ? { ...waypoints[0]! } : { ...waypoints[waypoints.length - 1]! };
}

/** Point shape attachments should “look toward” when dragging or re-anchoring endpoints. */
export function connectorEndpointTowardPoint(
  connector: {
    source: ConnectorEndpoint;
    target: ConnectorEndpoint;
    waypoints?: readonly { x: number; y: number }[];
  },
  side: "source" | "target",
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): Point {
  const waypoints = connector.waypoints ?? [];
  if (side === "source") {
    if (waypoints.length > 0) return { ...waypoints[0]! };
    return (
      connectorEndpointCenter(connector.target, elements, swimlanes, boundedContexts) ??
      (connector.target.attach === "point"
        ? { x: connector.target.x, y: connector.target.y }
        : { x: 0, y: 0 })
    );
  }
  if (waypoints.length > 0) return { ...waypoints[waypoints.length - 1]! };
  return (
    connectorEndpointCenter(connector.source, elements, swimlanes, boundedContexts) ??
    (connector.source.attach === "point"
      ? { x: connector.source.x, y: connector.source.y }
      : { x: 0, y: 0 })
  );
}
