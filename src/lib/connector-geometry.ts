import { ELEMENT_STYLES } from "@/lib/element-styles";
import type { StormElement } from "@/types/storm-element";

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
  const style = ELEMENT_STYLES[el.type];
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
