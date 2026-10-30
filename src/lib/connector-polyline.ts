import { resolveConnectorAnchors } from "@/lib/board-connector-resolve";
import type { Point } from "@/lib/connector-geometry";
import type { BoardConnector, ConnectorWaypoint } from "@/types/board-connector";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export function normalizeConnectorWaypoints(raw: unknown): ConnectorWaypoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ConnectorWaypoint[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const x = (entry as { x?: unknown }).x;
    const y = (entry as { y?: unknown }).y;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    out.push({ x, y });
  }
  return out.length ? out : undefined;
}

/** Resolved draw path: anchor start → waypoints → anchor end. */
export function resolveConnectorPolylinePoints(
  connector: Pick<BoardConnector, "source" | "target" | "waypoints">,
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): Point[] {
  const { start, end } = resolveConnectorAnchors(connector, elements, swimlanes, boundedContexts);
  const inner = connector.waypoints ?? [];
  return [start, ...inner, end];
}

export function polylineSegmentCount(pointCount: number): number {
  return Math.max(0, pointCount - 1);
}

export function projectPointOnSegment(
  point: Point,
  a: Point,
  b: Point,
): { point: Point; t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) {
    const distance = Math.hypot(point.x - a.x, point.y - a.y);
    return { point: { x: a.x, y: a.y }, t: 0, distance };
  }
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projected = { x: a.x + t * dx, y: a.y + t * dy };
  const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
  return { point: projected, t, distance };
}

/** Closest segment on the polyline and its index (segment i runs from points[i] to points[i+1]). */
export function closestSegmentOnPolyline(
  points: readonly Point[],
  world: Point,
): { segmentIndex: number; point: Point; distance: number } | null {
  if (points.length < 2) return null;
  let bestIndex = 0;
  let bestDistance = Infinity;
  let bestPoint = points[0]!;
  for (let i = 0; i < points.length - 1; i += 1) {
    const hit = projectPointOnSegment(world, points[i]!, points[i + 1]!);
    if (hit.distance < bestDistance) {
      bestDistance = hit.distance;
      bestIndex = i;
      bestPoint = hit.point;
    }
  }
  return { segmentIndex: bestIndex, point: bestPoint, distance: bestDistance };
}

/** Insert a bend after segment `segmentIndex` (between polyline points[segmentIndex] and [segmentIndex+1]). */
export function insertConnectorWaypoint(
  waypoints: ConnectorWaypoint[] | undefined,
  segmentIndex: number,
  point: Point,
): ConnectorWaypoint[] {
  const next = [...(waypoints ?? [])];
  next.splice(segmentIndex, 0, { x: point.x, y: point.y });
  return next;
}

export function removeConnectorWaypoint(
  waypoints: ConnectorWaypoint[] | undefined,
  index: number,
): ConnectorWaypoint[] | undefined {
  if (!waypoints?.length || index < 0 || index >= waypoints.length) return waypoints;
  const next = waypoints.filter((_, i) => i !== index);
  return next.length ? next : undefined;
}

export function updateConnectorWaypoint(
  waypoints: ConnectorWaypoint[] | undefined,
  index: number,
  point: Point,
): ConnectorWaypoint[] | undefined {
  if (!waypoints?.length || index < 0 || index >= waypoints.length) return waypoints;
  return waypoints.map((wp, i) => (i === index ? { x: point.x, y: point.y } : wp));
}

/** Midpoint along total polyline length (for captions / badges). */
export function polylineMidpointAlongPath(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0]! };
  let total = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const len = Math.hypot(points[i + 1]!.x - points[i]!.x, points[i + 1]!.y - points[i]!.y);
    segLens.push(len);
    total += len;
  }
  if (total < 1e-6) return { ...points[0]! };
  let half = total / 2;
  for (let i = 0; i < segLens.length; i += 1) {
    const len = segLens[i]!;
    if (half <= len) {
      const t = len > 0 ? half / len : 0;
      return {
        x: points[i]!.x + (points[i + 1]!.x - points[i]!.x) * t,
        y: points[i]!.y + (points[i + 1]!.y - points[i]!.y) * t,
      };
    }
    half -= len;
  }
  return { ...points[points.length - 1]! };
}

/** Offset for caption badge perpendicular to the segment at the path midpoint. */
export function polylineCaptionAnchor(points: readonly Point[]): {
  mid: Point;
  badgeX: number;
  badgeY: number;
} {
  const mid = polylineMidpointAlongPath(points);
  if (points.length < 2) {
    return { mid, badgeX: mid.x, badgeY: mid.y - 14 };
  }
  let total = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segLens.push(
      Math.hypot(points[i + 1]!.x - points[i]!.x, points[i + 1]!.y - points[i]!.y),
    );
    total += segLens[i]!;
  }
  const half = total / 2;
  let acc = 0;
  for (let i = 0; i < segLens.length; i += 1) {
    const len = segLens[i]!;
    if (acc + len >= half - 1e-6) {
      const dx = points[i + 1]!.x - points[i]!.x;
      const dy = points[i + 1]!.y - points[i]!.y;
      const segLen = len || 1;
      return {
        mid,
        badgeX: mid.x + (-dy / segLen) * 14,
        badgeY: mid.y + (dx / segLen) * 14,
      };
    }
    acc += len;
  }
  const last = points.length - 1;
  const dx = points[last]!.x - points[last - 1]!.x;
  const dy = points[last]!.y - points[last - 1]!.y;
  const segLen = Math.hypot(dx, dy) || 1;
  return {
    mid,
    badgeX: mid.x + (-dy / segLen) * 14,
    badgeY: mid.y + (dx / segLen) * 14,
  };
}

export function polylinePointsAttr(points: readonly Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}
