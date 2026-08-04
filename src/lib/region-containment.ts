import { elementBounds, type WorldRect } from "@/lib/selection-geometry";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

/** True if `outer` fully contains `inner` (edges may touch). */
export function rectFullyContains(outer: WorldRect, inner: WorldRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

export function swimlaneBounds(lane: Swimlane): WorldRect {
  return {
    x: lane.x ?? 0,
    y: lane.y,
    w: lane.width ?? 4000,
    h: lane.height,
  };
}

export function boundedContextBounds(bc: BoundedContext): WorldRect {
  return { x: bc.x, y: bc.y, w: bc.width, h: bc.height };
}

function area(r: WorldRect): number {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

/** Fully containing swimlane, or undefined if none. Prefer smallest area on ties. */
export function resolveSwimlaneId(
  el: StormElement,
  swimlanes: Swimlane[],
): string | undefined {
  const bounds = elementBounds(el);
  let best: { id: string; area: number } | null = null;
  for (const lane of swimlanes) {
    const outer = swimlaneBounds(lane);
    if (!rectFullyContains(outer, bounds)) continue;
    const a = area(outer);
    if (!best || a < best.area) best = { id: lane.id, area: a };
  }
  return best?.id;
}

/** Fully containing BC, or undefined if none. Prefer smallest area (nested contexts). */
export function resolveBoundedContextId(
  el: StormElement,
  boundedContexts: BoundedContext[],
): string | undefined {
  const bounds = elementBounds(el);
  let best: { id: string; area: number } | null = null;
  for (const bc of boundedContexts) {
    const outer = boundedContextBounds(bc);
    if (!rectFullyContains(outer, bounds)) continue;
    const a = area(outer);
    if (!best || a < best.area) best = { id: bc.id, area: a };
  }
  return best?.id;
}

/**
 * Fully containing Aggregate Root, or undefined if none.
 * Aggregates never nest inside other aggregates.
 * Prefer smallest area when multiple aggregates enclose the element.
 */
export function resolveAggregateId(
  el: StormElement,
  aggregates: StormElement[],
): string | undefined {
  if (el.type === "aggregate") return undefined;
  const bounds = elementBounds(el);
  let best: { id: string; area: number } | null = null;
  for (const agg of aggregates) {
    if (agg.type !== "aggregate" || agg.id === el.id) continue;
    const outer = elementBounds(agg);
    if (!rectFullyContains(outer, bounds)) continue;
    const a = area(outer);
    if (!best || a < best.area) best = { id: agg.id, area: a };
  }
  return best?.id;
}

/**
 * Fully containing Subdomain, or undefined if none.
 * Subdomains never nest inside other subdomains.
 * Prefer smallest area when multiple subdomains enclose the element.
 */
export function resolveSubdomainId(
  el: StormElement,
  subdomains: StormElement[],
): string | undefined {
  if (el.type === "subdomain") return undefined;
  const bounds = elementBounds(el);
  let best: { id: string; area: number } | null = null;
  for (const sub of subdomains) {
    if (sub.type !== "subdomain" || sub.id === el.id) continue;
    const outer = elementBounds(sub);
    if (!rectFullyContains(outer, bounds)) continue;
    const a = area(outer);
    if (!best || a < best.area) best = { id: sub.id, area: a };
  }
  return best?.id;
}

/**
 * Returns a new elements array when any swimlaneId / boundedContextId /
 * aggregateId / subdomainId must change based on full geometric containment;
 * otherwise returns the same reference.
 */
export function applyContainmentAssignments(
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): StormElement[] {
  const aggregates = elements.filter((e) => e.type === "aggregate");
  const subdomains = elements.filter((e) => e.type === "subdomain");
  let changed = false;
  const next = elements.map((el) => {
    const swimlaneId = resolveSwimlaneId(el, swimlanes);
    const boundedContextId = resolveBoundedContextId(el, boundedContexts);
    const aggregateId = resolveAggregateId(el, aggregates);
    const subdomainId = resolveSubdomainId(el, subdomains);
    if (
      el.swimlaneId === swimlaneId &&
      el.boundedContextId === boundedContextId &&
      el.aggregateId === aggregateId &&
      el.subdomainId === subdomainId
    ) {
      return el;
    }
    changed = true;
    return { ...el, swimlaneId, boundedContextId, aggregateId, subdomainId };
  });
  return changed ? next : elements;
}

/** Element IDs that should move with a swimlane (assigned or fully contained now). */
export function elementIdsInSwimlane(
  elements: StormElement[],
  lane: Swimlane,
): string[] {
  const outer = swimlaneBounds(lane);
  return elements
    .filter((e) => e.swimlaneId === lane.id || rectFullyContains(outer, elementBounds(e)))
    .map((e) => e.id);
}

/** Element IDs that should move with a bounded context (assigned or fully contained now). */
export function elementIdsInBoundedContext(
  elements: StormElement[],
  bc: BoundedContext,
): string[] {
  const outer = boundedContextBounds(bc);
  return elements
    .filter((e) => e.boundedContextId === bc.id || rectFullyContains(outer, elementBounds(e)))
    .map((e) => e.id);
}

/** Element IDs that should move with an Aggregate Root (assigned or fully contained now). */
export function elementIdsInAggregate(
  elements: StormElement[],
  aggregate: StormElement,
): string[] {
  if (aggregate.type !== "aggregate") return [];
  const outer = elementBounds(aggregate);
  return elements
    .filter(
      (e) =>
        e.id !== aggregate.id &&
        (e.aggregateId === aggregate.id || rectFullyContains(outer, elementBounds(e))),
    )
    .map((e) => e.id);
}

/** Element IDs that should move with a Subdomain (assigned or fully contained now). */
export function elementIdsInSubdomain(
  elements: StormElement[],
  subdomain: StormElement,
): string[] {
  if (subdomain.type !== "subdomain") return [];
  const outer = elementBounds(subdomain);
  return elements
    .filter(
      (e) =>
        e.id !== subdomain.id &&
        (e.subdomainId === subdomain.id || rectFullyContains(outer, elementBounds(e))),
    )
    .map((e) => e.id);
}

/** Translate all elements matching `predicate` by (dx, dy). */
export function translateMatchingElements(
  elements: StormElement[],
  predicate: (el: StormElement) => boolean,
  dx: number,
  dy: number,
): StormElement[] {
  if (dx === 0 && dy === 0) return elements;
  let changed = false;
  const next = elements.map((el) => {
    if (!predicate(el)) return el;
    changed = true;
    return { ...el, x: el.x + dx, y: el.y + dy };
  });
  return changed ? next : elements;
}
