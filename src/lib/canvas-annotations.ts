import { generateStormId } from "@/lib/storm-id";
import {
  LINE_ARROW_HEADS,
  type CanvasLine,
  type LineArrowHead,
  type ViewBookmark,
} from "@/types/canvas-annotation";
import type { Viewport } from "@/types/storm-element";

export function normalizeCanvasLine(raw: Partial<CanvasLine>): CanvasLine | null {
  if (
    typeof raw.x1 !== "number" ||
    typeof raw.y1 !== "number" ||
    typeof raw.x2 !== "number" ||
    typeof raw.y2 !== "number"
  ) {
    return null;
  }
  const arrowHead = LINE_ARROW_HEADS.includes(raw.arrowHead as LineArrowHead)
    ? (raw.arrowHead as LineArrowHead)
    : "none";
  return {
    id: raw.id?.trim() || generateStormId(),
    x1: raw.x1,
    y1: raw.y1,
    x2: raw.x2,
    y2: raw.y2,
    arrowHead,
    label: raw.label?.trim() || undefined,
    color: raw.color?.trim() || undefined,
  };
}

export function normalizeCanvasLines(raw: unknown): CanvasLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: CanvasLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const normalized = normalizeCanvasLine(entry as Partial<CanvasLine>);
    if (normalized) lines.push(normalized);
  }
  return lines;
}

export function normalizeViewBookmark(
  raw: Partial<ViewBookmark> & { name?: string; viewport?: Partial<Viewport>; viewId?: string },
  fallbackViewId?: string,
): ViewBookmark | null {
  const name = raw.name?.trim();
  if (!name) return null;
  const viewId = raw.viewId?.trim() || fallbackViewId?.trim();
  if (!viewId) return null;
  const viewport = raw.viewport;
  if (
    !viewport ||
    typeof viewport.x !== "number" ||
    typeof viewport.y !== "number" ||
    typeof viewport.zoom !== "number"
  ) {
    return null;
  }
  return {
    id: raw.id?.trim() || generateStormId(),
    name,
    viewId,
    viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
  };
}

export function normalizeViewBookmarks(raw: unknown, fallbackViewId?: string): ViewBookmark[] {
  if (!Array.isArray(raw)) return [];
  const bookmarks: ViewBookmark[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const normalized = normalizeViewBookmark(entry as Partial<ViewBookmark>, fallbackViewId);
    if (normalized) bookmarks.push(normalized);
  }
  return bookmarks;
}

export function lineLength(line: Pick<CanvasLine, "x1" | "y1" | "x2" | "y2">): number {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}
