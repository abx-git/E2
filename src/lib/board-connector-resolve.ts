import { rectAnchorToward, type Point } from "@/lib/connector-geometry";
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
 * Shape attachments always aim at `toward` (typically the opposite center) and
 * terminate on the rectangle edge — click/drag approach is intentionally ignored.
 */
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
  return rectAnchorToward(rect, toward);
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
