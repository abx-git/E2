import { ELEMENT_STYLES } from "@/lib/element-styles";
import { itemZIndex, sortByZOrder } from "@/lib/element-z-order";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export interface WorldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function elementBounds(el: StormElement): WorldRect {
  const style = ELEMENT_STYLES[el.type];
  return {
    x: el.x,
    y: el.y,
    w: el.width ?? style.defaultWidth,
    h: el.height ?? style.defaultHeight,
  };
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
  return {
    x: bc.x,
    y: bc.y,
    w: bc.width,
    h: bc.height,
  };
}

export function rectsIntersect(a: WorldRect, b: WorldRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function elementsInMarquee(elements: StormElement[], marquee: WorldRect): string[] {
  if (marquee.w <= 0 || marquee.h <= 0) return [];
  return elements.filter((el) => rectsIntersect(elementBounds(el), marquee)).map((el) => el.id);
}

export function swimlanesInMarquee(lanes: Swimlane[], marquee: WorldRect): string[] {
  if (marquee.w <= 0 || marquee.h <= 0) return [];
  return lanes.filter((lane) => rectsIntersect(swimlaneBounds(lane), marquee)).map((lane) => lane.id);
}

export function boundedContextsInMarquee(
  contexts: BoundedContext[],
  marquee: WorldRect,
): string[] {
  if (marquee.w <= 0 || marquee.h <= 0) return [];
  return contexts
    .filter((bc) => rectsIntersect(boundedContextBounds(bc), marquee))
    .map((bc) => bc.id);
}

export type MarqueeRegionHit =
  | { kind: "swimlane"; id: string }
  | { kind: "boundedContext"; id: string };

/**
 * Topmost swimlane / bounded context intersecting the marquee (by z-order).
 * Prefer this only when no sticky elements were hit.
 */
export function topRegionInMarquee(
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
  marquee: WorldRect,
): MarqueeRegionHit | null {
  const laneIds = new Set(swimlanesInMarquee(swimlanes, marquee));
  const bcIds = new Set(boundedContextsInMarquee(boundedContexts, marquee));
  if (laneIds.size === 0 && bcIds.size === 0) return null;

  const hits = [
    ...swimlanes.filter((l) => laneIds.has(l.id)),
    ...boundedContexts.filter((b) => bcIds.has(b.id)),
  ];
  const top = sortByZOrder(hits).at(-1);
  if (!top) return null;
  if (laneIds.has(top.id)) return { kind: "swimlane", id: top.id };
  return { kind: "boundedContext", id: top.id };
}

/** @internal exported for tests */
export function regionHitZIndex(
  hit: MarqueeRegionHit,
  swimlanes: Swimlane[],
  boundedContexts: BoundedContext[],
): number {
  const item =
    hit.kind === "swimlane"
      ? swimlanes.find((l) => l.id === hit.id)
      : boundedContexts.find((b) => b.id === hit.id);
  return item ? itemZIndex(item) : 0;
}
