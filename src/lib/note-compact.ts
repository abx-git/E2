import { styleForElementType } from "@/lib/element-styles";
import type { WorldRect } from "@/lib/selection-geometry";
import type { StormElement } from "@/types/storm-element";

/** Footprint of a collapsed note on canvas and in raster export. */
export const NOTE_COMPACT_SIZE_PX = 32;

export function noteUsesCompactLayout(
  element: Pick<StormElement, "type">,
  notesCompact: boolean,
): boolean {
  return notesCompact && element.type === "note";
}

export function noteExportRect(
  element: Pick<StormElement, "type" | "x" | "y" | "width" | "height">,
  notesCompact: boolean,
  defaultWidth: number,
  defaultHeight: number,
): { x: number; y: number; w: number; h: number } {
  const w = element.width ?? defaultWidth;
  const h = element.height ?? defaultHeight;
  if (!noteUsesCompactLayout(element, notesCompact)) {
    return { x: element.x, y: element.y, w, h };
  }
  return {
    x: element.x,
    y: element.y,
    w: NOTE_COMPACT_SIZE_PX,
    h: NOTE_COMPACT_SIZE_PX,
  };
}

/** Canvas / connector / export footprint (full size unless notes are in compact mode). */
export function elementCanvasBounds(el: StormElement, notesCompact: boolean): WorldRect {
  const style = styleForElementType(el.type);
  return noteExportRect(el, notesCompact, style.defaultWidth, style.defaultHeight);
}
