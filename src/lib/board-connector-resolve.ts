import { rectAnchorToward, type Point } from "@/lib/connector-geometry";
import {
  boundsForConnectorTarget,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import type { ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export function attachTargetToEndpoint(target: ConnectorAttachTarget): ConnectorEndpoint {
  if (target.kind === "element") return { attach: "element", id: target.id };
  if (target.kind === "boundedContext") return { attach: "boundedContext", id: target.id };
  return { attach: "swimlane", id: target.id };
}

export function connectorEndpointToAttachTarget(
  endpoint: ConnectorEndpoint,
): ConnectorAttachTarget | null {
  if (endpoint.attach === "element") return { kind: "element", id: endpoint.id };
  if (endpoint.attach === "boundedContext") return { kind: "boundedContext", id: endpoint.id };
  if (endpoint.attach === "swimlane") return { kind: "swimlane", id: endpoint.id };
  return null;
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
  return rectAnchorToward(rect, toward);
}

export function resolveConnectorAnchors(
  connector: { source: ConnectorEndpoint; target: ConnectorEndpoint },
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): { start: Point; end: Point } {
  const targetCenterGuess = connector.target.attach === "point"
    ? { x: connector.target.x, y: connector.target.y }
    : { x: 0, y: 0 };
  const sourceCenterGuess = connector.source.attach === "point"
    ? { x: connector.source.x, y: connector.source.y }
    : { x: 0, y: 0 };

  const end = resolveConnectorEndpointPoint(
    connector.target,
    sourceCenterGuess,
    elements,
    swimlanes,
    boundedContexts,
  );
  const start = resolveConnectorEndpointPoint(
    connector.source,
    end,
    elements,
    swimlanes,
    boundedContexts,
  );
  return { start, end };
}
