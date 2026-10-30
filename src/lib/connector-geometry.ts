import { styleForElementType } from "@/lib/element-styles";
import type { BoundedContext, StormElement } from "@/types/storm-element";

export interface Point {
  x: number;
  y: number;
}

export interface ElementRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function elementRect(el: StormElement): ElementRect {
  const style = styleForElementType(el.type);
  return {
    x: el.x,
    y: el.y,
    w: el.width ?? style.defaultWidth,
    h: el.height ?? style.defaultHeight,
  };
}

export function elementCenter(el: StormElement): Point {
  const rect = elementRect(el);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function boundedContextRect(bc: BoundedContext): ElementRect {
  return { x: bc.x, y: bc.y, w: bc.width, h: bc.height };
}

export function boundedContextCenter(bc: BoundedContext): Point {
  return { x: bc.x + bc.width / 2, y: bc.y + bc.height / 2 };
}

export function rectCenter(rect: ElementRect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** Closest point on the rectangle border in the direction of `toward` from the center. */
export function rectAnchorToward(rect: ElementRect, toward: Point): Point {
  const center = rectCenter(rect);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return { x: center.x, y: rect.y + rect.h };
  }
  const hw = rect.w / 2;
  const hh = rect.h / 2;
  const scaleX = Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(scaleX, scaleY);
  return { x: center.x + dx * t, y: center.y + dy * t };
}

/** Intersection of the ray from `from` toward `toward` with the rectangle edge. */
export function rectEdgePoint(rect: ElementRect, from: Point, toward: Point): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const hw = rect.w / 2;
  const hh = rect.h / 2;

  const scaleX = Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(scaleX, scaleY);

  return { x: cx + dx * t, y: cy + dy * t };
}

/** First intersection of the ray `from` → `toward` with the rectangle border (smallest t ≥ 0). */
export function rectBorderHitFromRay(rect: ElementRect, from: Point, toward: Point): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return rectAnchorToward(rect, toward);
  }

  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;

  let bestT = Number.POSITIVE_INFINITY;
  let best: Point | null = null;

  const consider = (t: number, x: number, y: number) => {
    if (t < -1e-6) return;
    if (x < left - 1e-4 || x > right + 1e-4 || y < top - 1e-4 || y > bottom + 1e-4) return;
    if (t < bestT) {
      bestT = t;
      best = { x, y };
    }
  };

  if (Math.abs(dx) > 1e-9) {
    consider((left - from.x) / dx, left, from.y + ((left - from.x) / dx) * dy);
    consider((right - from.x) / dx, right, from.y + ((right - from.x) / dx) * dy);
  }
  if (Math.abs(dy) > 1e-9) {
    consider((top - from.y) / dy, from.x + ((top - from.y) / dy) * dx, top);
    consider((bottom - from.y) / dy, from.x + ((bottom - from.y) / dy) * dx, bottom);
  }

  return best ?? rectAnchorToward(rect, toward);
}

export function relationAnchors(source: StormElement, target: StormElement): { start: Point; end: Point } {
  const sc = elementCenter(source);
  const tc = elementCenter(target);
  const sRect = elementRect(source);
  const tRect = elementRect(target);
  return {
    start: rectEdgePoint(sRect, sc, tc),
    end: rectEdgePoint(tRect, tc, sc),
  };
}

/** Context-map arrows: edge of source BC → edge of target BC. */
export function contextRelationAnchors(
  source: BoundedContext,
  target: BoundedContext,
): { start: Point; end: Point } {
  const sc = boundedContextCenter(source);
  const tc = boundedContextCenter(target);
  return {
    start: rectEdgePoint(boundedContextRect(source), sc, tc),
    end: rectEdgePoint(boundedContextRect(target), tc, sc),
  };
}
