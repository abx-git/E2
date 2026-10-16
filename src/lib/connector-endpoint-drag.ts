import { screenToWorld } from "@/lib/canvas-viewport";
import type { Viewport } from "@/types/storm-element";

export type ConnectorEndpoint = "source" | "target";

export function beginConnectorEndpointDrag(options: {
  zoom: number;
  viewport: Viewport;
  getContainerRect: () => DOMRect | null;
  onMove: (world: { x: number; y: number }) => void;
  onCommit: (world: { x: number; y: number }) => void;
  onCancel?: () => void;
}): void {
  const { zoom, viewport, getContainerRect, onMove, onCommit, onCancel } = options;

  const worldFromClient = (clientX: number, clientY: number) => {
    const rect = getContainerRect();
    if (!rect) return null;
    return screenToWorld(viewport, clientX, clientY, rect);
  };

  const onPointerMove = (ev: PointerEvent) => {
    const world = worldFromClient(ev.clientX, ev.clientY);
    if (world) onMove(world);
  };

  const onPointerUp = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    const world = worldFromClient(ev.clientX, ev.clientY);
    if (world) onCommit(world);
    else onCancel?.();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

export function connectorEndpointHandleRadius(selected: boolean): number {
  return selected ? 8 : 0;
}
