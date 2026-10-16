import type { Viewport } from "@/types/storm-element";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 0.1;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function zoomAtPoint(
  viewport: Viewport,
  delta: number,
  clientX: number,
  clientY: number,
  rect: DOMRect,
): Viewport {
  const oldZoom = viewport.zoom;
  const newZoom = clampZoom(oldZoom + delta);
  if (newZoom === oldZoom) return viewport;

  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const worldX = (px - viewport.x) / oldZoom;
  const worldY = (py - viewport.y) / oldZoom;

  return {
    x: px - worldX * newZoom,
    y: py - worldY * newZoom,
    zoom: newZoom,
  };
}

export function screenToWorld(
  viewport: Viewport,
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  };
}

export function snapToTimeline(y: number, timelineY: number, threshold = 40): number {
  return Math.abs(y - timelineY) < threshold ? timelineY : y;
}

export function snapToGrid(value: number, gridSize = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Fit `content` into the canvas container with optional screen padding (px). */
export function viewportFitContent(
  content: { x: number; y: number; w: number; h: number },
  containerWidth: number,
  containerHeight: number,
  paddingPx = 48,
): Viewport {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const innerW = Math.max(1, containerWidth - paddingPx * 2);
  const innerH = Math.max(1, containerHeight - paddingPx * 2);
  const contentW = Math.max(1, content.w);
  const contentH = Math.max(1, content.h);

  const zoom = clampZoom(Math.min(innerW / contentW, innerH / contentH));
  const centerX = content.x + content.w / 2;
  const centerY = content.y + content.h / 2;

  return {
    zoom,
    x: containerWidth / 2 - centerX * zoom,
    y: containerHeight / 2 - centerY * zoom,
  };
}
