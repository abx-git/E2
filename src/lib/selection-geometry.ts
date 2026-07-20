import { ELEMENT_STYLES } from "@/lib/element-styles";
import type { StormElement } from "@/types/storm-element";

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

export function rectsIntersect(a: WorldRect, b: WorldRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function elementsInMarquee(elements: StormElement[], marquee: WorldRect): string[] {
  if (marquee.w <= 0 || marquee.h <= 0) return [];
  return elements.filter((el) => rectsIntersect(elementBounds(el), marquee)).map((el) => el.id);
}
