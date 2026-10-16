import { rectAnchorToward } from "@/lib/connector-geometry";
import {
  boundedContextBounds,
  elementBounds,
  swimlaneBounds,
  type WorldRect,
} from "@/lib/selection-geometry";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export interface WorldPoint {
  x: number;
  y: number;
}

export type ConnectorAttachTarget =
  | { kind: "element"; id: string }
  | { kind: "boundedContext"; id: string }
  | { kind: "swimlane"; id: string };

function rectArea(rect: WorldRect): number {
  return Math.max(0, rect.w) * Math.max(0, rect.h);
}

export function pointInWorldRect(point: WorldPoint, rect: WorldRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

type Candidate = ConnectorAttachTarget & { area: number };

const KIND_RANK: Record<ConnectorAttachTarget["kind"], number> = {
  element: 0,
  boundedContext: 1,
  swimlane: 2,
};

function betterCandidate(a: Candidate, b: Candidate): Candidate {
  if (a.area !== b.area) return a.area < b.area ? a : b;
  const rankA = KIND_RANK[a.kind];
  const rankB = KIND_RANK[b.kind];
  if (rankA !== rankB) return rankA < rankB ? a : b;
  return a.id.localeCompare(b.id) <= 0 ? a : b;
}

/**
 * Innermost object at `point`: smallest area among all containing elements,
 * bounded contexts, and swimlanes.
 */
export function pickInnermostConnectorTargetAt(
  point: WorldPoint,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): ConnectorAttachTarget | null {
  let best: Candidate | null = null;

  for (const el of elements) {
    const bounds = elementBounds(el);
    if (!pointInWorldRect(point, bounds)) continue;
    const candidate: Candidate = { kind: "element", id: el.id, area: rectArea(bounds) };
    best = best ? betterCandidate(best, candidate) : candidate;
  }

  for (const bc of boundedContexts) {
    const bounds = boundedContextBounds(bc);
    if (!pointInWorldRect(point, bounds)) continue;
    const candidate: Candidate = { kind: "boundedContext", id: bc.id, area: rectArea(bounds) };
    best = best ? betterCandidate(best, candidate) : candidate;
  }

  for (const lane of swimlanes) {
    const bounds = swimlaneBounds(lane);
    if (!pointInWorldRect(point, bounds)) continue;
    const candidate: Candidate = { kind: "swimlane", id: lane.id, area: rectArea(bounds) };
    best = best ? betterCandidate(best, candidate) : candidate;
  }

  return best ? { kind: best.kind, id: best.id } : null;
}

function expandRect(rect: WorldRect, margin: number): WorldRect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    w: rect.w + margin * 2,
    h: rect.h + margin * 2,
  };
}

/** Like pickInnermostConnectorTargetAt but also snaps when the pointer is near a shape edge. */
export function pickConnectorTargetSnapAt(
  point: WorldPoint,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  snapMargin = 28,
): ConnectorAttachTarget | null {
  const direct = pickInnermostConnectorTargetAt(point, elements, swimlanes, boundedContexts);
  if (direct) return direct;

  let best: Candidate | undefined;

  const consider = (bounds: WorldRect, candidate: ConnectorAttachTarget) => {
    if (!pointInWorldRect(point, expandRect(bounds, snapMargin))) return;
    const entry: Candidate = { ...candidate, area: rectArea(bounds) };
    best = best === undefined ? entry : betterCandidate(best, entry);
  };

  for (const el of elements) {
    consider(elementBounds(el), { kind: "element", id: el.id });
  }
  for (const bc of boundedContexts) {
    consider(boundedContextBounds(bc), { kind: "boundedContext", id: bc.id });
  }
  for (const lane of swimlanes) {
    consider(swimlaneBounds(lane), { kind: "swimlane", id: lane.id });
  }

  if (best === undefined) return null;
  return { kind: best.kind, id: best.id };
}

export function boundsForConnectorTarget(
  target: ConnectorAttachTarget,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): WorldRect | null {
  if (target.kind === "element") {
    const el = elements.find((e) => e.id === target.id);
    return el ? elementBounds(el) : null;
  }
  if (target.kind === "boundedContext") {
    const bc = boundedContexts.find((b) => b.id === target.id);
    return bc ? boundedContextBounds(bc) : null;
  }
  const lane = swimlanes.find((l) => l.id === target.id);
  return lane ? swimlaneBounds(lane) : null;
}

export type ConnectorTargetFilter =
  | ConnectorAttachTarget["kind"]
  | readonly ConnectorAttachTarget["kind"][];

export interface ConnectorEndpointDragPreview {
  /** Snapped edge point when valid, otherwise pointer position. */
  lineEnd: WorldPoint;
  target: ConnectorAttachTarget | null;
  valid: boolean;
}

function acceptsTarget(
  target: ConnectorAttachTarget,
  accept: ConnectorTargetFilter,
): boolean {
  const kinds = Array.isArray(accept) ? accept : [accept];
  return kinds.includes(target.kind);
}

/**
 * Preview while dragging a connector end: pick innermost target, snap to its edge
 * toward `toward` when the target kind is accepted.
 */
export function connectorEndpointDragPreview(
  pointer: WorldPoint,
  toward: WorldPoint,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  accept: ConnectorTargetFilter,
): ConnectorEndpointDragPreview {
  const target = pickConnectorTargetSnapAt(pointer, elements, swimlanes, boundedContexts);
  if (!target || !acceptsTarget(target, accept)) {
    return { lineEnd: pointer, target, valid: false };
  }
  const bounds = boundsForConnectorTarget(target, elements, swimlanes, boundedContexts);
  if (!bounds) return { lineEnd: pointer, target, valid: false };
  const rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
  return {
    lineEnd: rectAnchorToward(rect, toward),
    target,
    valid: true,
  };
}
