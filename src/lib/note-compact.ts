import { styleForElementType } from "@/lib/element-styles";
import type { WorldRect } from "@/lib/selection-geometry";
import type { StormElement } from "@/types/storm-element";

/** Footprint of a collapsed note on canvas and in raster export. */
export const NOTE_COMPACT_SIZE_PX = 32;

/** Effective compact flag: per-note override, else view default. */
export function resolveNoteCompactLayout(
  element: Pick<StormElement, "type" | "metadata">,
  viewNotesCompactDefault: boolean,
): boolean {
  if (element.type !== "note") return false;
  const override = element.metadata?.noteCompact;
  if (override !== undefined) return override;
  return viewNotesCompactDefault;
}

/** @deprecated Prefer resolveNoteCompactLayout */
export function noteUsesCompactLayout(
  element: Pick<StormElement, "type" | "metadata">,
  viewNotesCompactDefault: boolean,
): boolean {
  return resolveNoteCompactLayout(element, viewNotesCompactDefault);
}

export function noteExportRect(
  element: Pick<StormElement, "type" | "x" | "y" | "width" | "height">,
  compact: boolean,
  defaultWidth: number,
  defaultHeight: number,
): { x: number; y: number; w: number; h: number } {
  const w = element.width ?? defaultWidth;
  const h = element.height ?? defaultHeight;
  if (!compact || element.type !== "note") {
    return { x: element.x, y: element.y, w, h };
  }
  return {
    x: element.x,
    y: element.y,
    w: NOTE_COMPACT_SIZE_PX,
    h: NOTE_COMPACT_SIZE_PX,
  };
}

/** Canvas / connector / export footprint (respects per-note override). */
export function elementCanvasBounds(
  el: StormElement,
  viewNotesCompactDefault: boolean,
): WorldRect {
  const style = styleForElementType(el.type);
  const compact = resolveNoteCompactLayout(el, viewNotesCompactDefault);
  return noteExportRect(el, compact, style.defaultWidth, style.defaultHeight);
}

export function patchNoteCompactMetadata(
  metadata: StormElement["metadata"],
  noteCompact: boolean | undefined,
): StormElement["metadata"] {
  if (noteCompact === undefined) {
    if (metadata?.noteCompact === undefined) return metadata;
    const next = { ...metadata };
    delete next.noteCompact;
    return Object.keys(next).length > 0 ? next : undefined;
  }
  return { ...metadata, noteCompact };
}
