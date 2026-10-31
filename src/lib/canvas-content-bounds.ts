import { elementCanvasBounds } from "@/lib/note-compact";
import { resolveConnectorAnchors } from "@/lib/board-connector-resolve";
import {
  boundedContextBounds,
  elementBounds,
  swimlaneBounds,
  type WorldRect,
} from "@/lib/selection-geometry";
import type { BoardConnector } from "@/types/board-connector";
import type { CanvasLine } from "@/types/canvas-annotation";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

const DEFAULT_BOUNDS: WorldRect = { x: 0, y: 0, w: 800, h: 600 };

function expandRect(acc: WorldRect | null, next: WorldRect): WorldRect {
  if (!acc) return { ...next };
  const minX = Math.min(acc.x, next.x);
  const minY = Math.min(acc.y, next.y);
  const maxX = Math.max(acc.x + acc.w, next.x + next.w);
  const maxY = Math.max(acc.y + acc.h, next.y + next.h);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function expandPoint(acc: WorldRect | null, x: number, y: number, pad = 1): WorldRect {
  return expandRect(acc, { x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 });
}

export function computeCanvasContentBounds(input: {
  elements: StormElement[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  canvasLines?: CanvasLine[];
  connectors?: BoardConnector[];
  notesCompact?: boolean;
}): WorldRect {
  const notesCompact = input.notesCompact ?? false;
  let bounds: WorldRect | null = null;

  for (const el of input.elements) {
    bounds = expandRect(bounds, elementCanvasBounds(el, notesCompact));
  }
  for (const lane of input.swimlanes) {
    bounds = expandRect(bounds, swimlaneBounds(lane));
  }
  for (const bc of input.boundedContexts) {
    bounds = expandRect(bounds, boundedContextBounds(bc));
  }
  for (const line of input.canvasLines ?? []) {
    const minX = Math.min(line.x1, line.x2);
    const minY = Math.min(line.y1, line.y2);
    bounds = expandRect(bounds, {
      x: minX,
      y: minY,
      w: Math.max(1, Math.abs(line.x2 - line.x1)),
      h: Math.max(1, Math.abs(line.y2 - line.y1)),
    });
  }
  for (const conn of input.connectors ?? []) {
    if (conn.source.attach === "point") {
      bounds = expandPoint(bounds, conn.source.x, conn.source.y);
    }
    if (conn.target.attach === "point") {
      bounds = expandPoint(bounds, conn.target.x, conn.target.y);
    }
    const { start, end } = resolveConnectorAnchors(
      conn,
      input.elements,
      input.swimlanes,
      input.boundedContexts,
      notesCompact,
    );
    bounds = expandPoint(bounds, start.x, start.y, 2);
    bounds = expandPoint(bounds, end.x, end.y, 2);
    for (const wp of conn.waypoints ?? []) {
      bounds = expandPoint(bounds, wp.x, wp.y, 2);
    }
  }

  return bounds ?? DEFAULT_BOUNDS;
}
