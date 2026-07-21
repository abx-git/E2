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
 * Returns a new elements array when any swimlaneId / boundedContextId must change
 * based on full geometric containment; otherwise returns the same reference.
 */
export function applyContainmentAssignments(
  elements: StormElement[],
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): StormElement[] {
  let changed = false;
  const next = elements.map((el) => {
    const swimlaneId = resolveSwimlaneId(el, swimlanes);
    const boundedContextId = resolveBoundedContextId(el, boundedContexts);
    if (el.swimlaneId === swimlaneId && el.boundedContextId === boundedContextId) {
      return el;
    }
    changed = true;
    return { ...el, swimlaneId, boundedContextId };
  });
  return changed ? next : elements;
}
