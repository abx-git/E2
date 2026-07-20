import { elementBounds } from "@/lib/selection-geometry";
import type { StormElement } from "@/types/storm-element";

export type AlignMode =
  | "left"
  | "centerX"
  | "right"
  | "top"
  | "centerY"
  | "bottom"
  | "distributeX"
  | "distributeY"
  | "sameWidth"
  | "sameHeight";

export type ElementGeometryPatch = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type Sized = { id: string; x: number; y: number; w: number; h: number };

function sized(elements: StormElement[]): Sized[] {
  return elements.map((el) => {
    const b = elementBounds(el);
    return { id: el.id, x: b.x, y: b.y, w: b.w, h: b.h };
  });
}

/** Compute geometry updates to align / distribute / match size of selected elements. */
export function computeAlignPatches(
  elements: StormElement[],
  mode: AlignMode,
  referenceId?: string,
): ElementGeometryPatch[] {
  if (elements.length < 2) return [];
  const items = sized(elements);

  switch (mode) {
    case "left": {
      const edge = Math.min(...items.map((i) => i.x));
      return items.map((i) => ({ id: i.id, x: edge }));
    }
    case "right": {
      const edge = Math.max(...items.map((i) => i.x + i.w));
      return items.map((i) => ({ id: i.id, x: edge - i.w }));
    }
    case "centerX": {
      const min = Math.min(...items.map((i) => i.x));
      const max = Math.max(...items.map((i) => i.x + i.w));
      const mid = (min + max) / 2;
      return items.map((i) => ({ id: i.id, x: mid - i.w / 2 }));
    }
    case "top": {
      const edge = Math.min(...items.map((i) => i.y));
      return items.map((i) => ({ id: i.id, y: edge }));
    }
    case "bottom": {
      const edge = Math.max(...items.map((i) => i.y + i.h));
      return items.map((i) => ({ id: i.id, y: edge - i.h }));
    }
    case "centerY": {
      const min = Math.min(...items.map((i) => i.y));
      const max = Math.max(...items.map((i) => i.y + i.h));
      const mid = (min + max) / 2;
      return items.map((i) => ({ id: i.id, y: mid - i.h / 2 }));
    }
    case "distributeX": {
      if (items.length < 3) return [];
      const sorted = [...items].sort((a, b) => a.x - b.x);
      const span = sorted[sorted.length - 1].x + sorted[sorted.length - 1].w - sorted[0].x;
      const totalW = sorted.reduce((s, i) => s + i.w, 0);
      const gap = (span - totalW) / (sorted.length - 1);
      let x = sorted[0].x;
      return sorted.map((item) => {
        const patch = { id: item.id, x };
        x += item.w + gap;
        return patch;
      });
    }
    case "distributeY": {
      if (items.length < 3) return [];
      const sorted = [...items].sort((a, b) => a.y - b.y);
      const span = sorted[sorted.length - 1].y + sorted[sorted.length - 1].h - sorted[0].y;
      const totalH = sorted.reduce((s, i) => s + i.h, 0);
      const gap = (span - totalH) / (sorted.length - 1);
      let y = sorted[0].y;
      return sorted.map((item) => {
        const patch = { id: item.id, y };
        y += item.h + gap;
        return patch;
      });
    }
    case "sameWidth": {
      const ref =
        items.find((i) => i.id === referenceId) ?? items[0];
      return items.map((i) => ({ id: i.id, width: ref.w }));
    }
    case "sameHeight": {
      const ref =
        items.find((i) => i.id === referenceId) ?? items[0];
      return items.map((i) => ({ id: i.id, height: ref.h }));
    }
    default:
      return [];
  }
}
