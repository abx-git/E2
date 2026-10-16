import { attachTargetToEndpoint } from "@/lib/board-connector-resolve";
import { normalizeCanvasLine } from "@/lib/canvas-annotations";
import { pickConnectorTargetSnapAt } from "@/lib/connector-target-pick";
import { defaultRelationType } from "@/lib/relation-validation";
import { generateStormId } from "@/lib/storm-id";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";
import type { LineArrowHead } from "@/types/canvas-annotation";
import type { CanvasLine } from "@/types/canvas-annotation";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

export function stormRelationToConnector(rel: StormRelation): BoardConnector {
  return {
    id: rel.id,
    source: { attach: "element", id: rel.sourceId },
    target: { attach: "element", id: rel.targetId },
    arrowHead: "end",
    label: rel.label,
    labelMode: rel.labelMode,
    relationType: rel.type,
    strokeStyle: rel.strokeStyle,
    progressMark: rel.progressMark,
  };
}

export function contextRelationToConnector(rel: ContextRelation): BoardConnector {
  return {
    id: rel.id,
    source: { attach: "boundedContext", id: rel.sourceContextId },
    target: { attach: "boundedContext", id: rel.targetContextId },
    arrowHead: "end",
    label: rel.label,
    contextMapPattern: rel.type,
    labelMode: rel.label ? "custom" : undefined,
  };
}

export function canvasLineToConnector(line: CanvasLine): BoardConnector {
  return {
    id: line.id,
    source: { attach: "point", x: line.x1, y: line.y1 },
    target: { attach: "point", x: line.x2, y: line.y2 },
    arrowHead: line.arrowHead ?? "end",
    label: line.label,
    strokeStyle: line.strokeStyle,
    color: line.color,
  };
}

export function legacyToConnectors(
  relations: StormRelation[],
  contextRelations: ContextRelation[],
  canvasLines: CanvasLine[],
): BoardConnector[] {
  return [
    ...relations.map(stormRelationToConnector),
    ...contextRelations.map(contextRelationToConnector),
    ...canvasLines.map(canvasLineToConnector),
  ];
}

export function connectorToStormRelation(c: BoardConnector): StormRelation | null {
  if (c.source.attach !== "element" || c.target.attach !== "element" || !c.relationType) {
    return null;
  }
  return {
    id: c.id,
    type: c.relationType,
    sourceId: c.source.id,
    targetId: c.target.id,
    label: c.label,
    labelMode: c.labelMode,
    strokeStyle: c.strokeStyle,
    progressMark: c.progressMark,
  };
}

export function connectorToContextRelation(c: BoardConnector): ContextRelation | null {
  if (
    c.source.attach !== "boundedContext" ||
    c.target.attach !== "boundedContext" ||
    !c.contextMapPattern
  ) {
    return null;
  }
  return {
    id: c.id,
    type: c.contextMapPattern,
    sourceContextId: c.source.id,
    targetContextId: c.target.id,
    label: c.label,
  };
}

export function connectorToCanvasLine(c: BoardConnector): CanvasLine | null {
  if (c.source.attach !== "point" || c.target.attach !== "point") return null;
  const normalized = normalizeCanvasLine({
    id: c.id,
    x1: c.source.x,
    y1: c.source.y,
    x2: c.target.x,
    y2: c.target.y,
    arrowHead: c.arrowHead,
    label: c.label,
    color: c.color,
    strokeStyle: c.strokeStyle,
  });
  return normalized;
}

export function connectorsToLegacy(connectors: BoardConnector[]): {
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  canvasLines: CanvasLine[];
} {
  const relations: StormRelation[] = [];
  const contextRelations: ContextRelation[] = [];
  const canvasLines: CanvasLine[] = [];

  for (const c of connectors) {
    const storm = connectorToStormRelation(c);
    if (storm) {
      relations.push(storm);
      continue;
    }
    const ctx = connectorToContextRelation(c);
    if (ctx) {
      contextRelations.push(ctx);
      continue;
    }
    const line = connectorToCanvasLine(c);
    if (line) canvasLines.push(line);
  }

  return { relations, contextRelations, canvasLines };
}

export function normalizeBoardConnectors(raw: unknown): BoardConnector[] {
  if (!Array.isArray(raw)) return [];
  const out: BoardConnector[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Partial<BoardConnector>;
    if (typeof c.id !== "string" || !c.source || !c.target) continue;
    out.push({
      id: c.id,
      source: c.source as ConnectorEndpoint,
      target: c.target as ConnectorEndpoint,
      arrowHead: c.arrowHead,
      label: c.label,
      labelMode: c.labelMode,
      relationType: c.relationType,
      contextMapPattern: c.contextMapPattern,
      strokeStyle: c.strokeStyle,
      color: c.color,
      progressMark: c.progressMark,
    });
  }
  return out;
}

export function mergeLegacyIntoConnectors(
  connectors: BoardConnector[],
  relations: StormRelation[],
  contextRelations: ContextRelation[],
  canvasLines: CanvasLine[],
): BoardConnector[] {
  if (connectors.length > 0) return connectors;
  return legacyToConnectors(relations, contextRelations, canvasLines);
}

/** Infer connector fields when creating from two endpoints. */
export function inferConnectorSemantics(
  source: ConnectorEndpoint,
  target: ConnectorEndpoint,
  relationType?: import("@/types/storm-relation").RelationType,
  contextMapPattern?: import("@/types/storm-relation").ContextMapPattern,
): Partial<BoardConnector> {
  if (source.attach === "element" && target.attach === "element") {
    return {
      relationType,
      arrowHead: "end" as LineArrowHead,
      labelMode: relationType ? "type" : undefined,
    };
  }
  if (source.attach === "boundedContext" && target.attach === "boundedContext") {
    return { contextMapPattern: contextMapPattern ?? "customerSupplier", arrowHead: "end" };
  }
  return { arrowHead: "end" };
}

export function snapConnectorEndpoint(
  endpoint: ConnectorEndpoint,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  snapMargin = 28,
): ConnectorEndpoint {
  if (endpoint.attach !== "point") return endpoint;
  const target = pickConnectorTargetSnapAt(
    { x: endpoint.x, y: endpoint.y },
    elements,
    swimlanes,
    boundedContexts,
    snapMargin,
  );
  if (!target) return endpoint;
  return attachTargetToEndpoint(target, { x: endpoint.x, y: endpoint.y });
}

export function prepareConnectorEndpoints(
  source: ConnectorEndpoint,
  target: ConnectorEndpoint,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): { source: ConnectorEndpoint; target: ConnectorEndpoint; semantics: Partial<BoardConnector> } {
  const snappedSource = snapConnectorEndpoint(source, elements, swimlanes, boundedContexts);
  const snappedTarget = snapConnectorEndpoint(target, elements, swimlanes, boundedContexts);

  let relationType: import("@/types/storm-relation").RelationType | undefined;
  if (snappedSource.attach === "element" && snappedTarget.attach === "element") {
    const src = elements.find((e) => e.id === snappedSource.id);
    const tgt = elements.find((e) => e.id === snappedTarget.id);
    if (src && tgt) relationType = defaultRelationType(src, tgt);
  }

  const semantics = inferConnectorSemantics(snappedSource, snappedTarget, relationType);
  return { source: snappedSource, target: snappedTarget, semantics };
}

export function newConnectorId(): string {
  return generateStormId();
}
