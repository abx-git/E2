import { rectAnchorToward, type Point } from "@/lib/connector-geometry";
import {
  boundsForConnectorTarget,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import type { ConnectorApproach, ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export function attachTargetToEndpoint(
  target: ConnectorAttachTarget,
  approach?: ConnectorApproach,
): ConnectorEndpoint {
  if (target.kind === "element") {
    return approach ? { attach: "element", id: target.id, approach } : { attach: "element", id: target.id };
  }
  if (target.kind === "boundedContext") {
    return approach
      ? { attach: "boundedContext", id: target.id, approach }
      : { attach: "boundedContext", id: target.id };
  }
  return approach
    ? { attach: "swimlane", id: target.id, approach }
    : { attach: "swimlane", id: target.id };
}

export function withConnectorApproach(
  endpoint: ConnectorEndpoint,
  approach?: ConnectorApproach,
): ConnectorEndpoint {
  if (endpoint.attach === "point" || !approach) return endpoint;
  return { ...endpoint, approach };
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

function edgeToward(endpoint: ConnectorEndpoint, fallback: Point): Point {
  if (endpoint.attach !== "point" && endpoint.approach) return endpoint.approach;
  return fallback;
}

export function resolveConnectorEndpointPoint(
  endpoint: ConnectorEndpoint,
  toward: Point,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): Point {
  if (endpoint.attach === "point") {
    return { x: endpoint.x, y: endpoint.y };
  }
  const attach = connectorEndpointToAttachTarget(endpoint);
  if (!attach) return toward;
  const bounds = boundsForConnectorTarget(attach, elements, swimlanes, boundedContexts);
  if (!bounds) return toward;
  const rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
  return rectAnchorToward(rect, edgeToward(endpoint, toward));
}

export function resolveConnectorAnchors(
  connector: { source: ConnectorEndpoint; target: ConnectorEndpoint },
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): { start: Point; end: Point } {
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

  const end = resolveConnectorEndpointPoint(
    connector.target,
    sourceCenter,
    elements,
    swimlanes,
    boundedContexts,
  );
  const start = resolveConnectorEndpointPoint(
    connector.source,
    targetCenter,
    elements,
    swimlanes,
    boundedContexts,
  );
  return { start, end };
}
