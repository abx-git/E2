import { elementDimensions } from "@/lib/element-styles";
import { screenToWorld, snapToGrid, snapToTimeline } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ElementType } from "@/types/storm-element";

/** Fixed world size of the storm canvas (`data-canvas-world`). */
export const BOARD_CANVAS_WORLD_WIDTH = 4000;

export type PaletteDropSnap = {
  snapToGrid?: boolean;
  snapToTimeline?: boolean;
  timelineY?: number;
};

/**
 * World top-left for a palette drop at `world` (pointer position in canvas space).
 * Swimlanes span the full board width from x=0; other types center on the pointer.
 */
export function paletteDropTopLeft(
  type: ElementType,
  world: { x: number; y: number },
  snap: PaletteDropSnap = {},
): { x: number; y: number } {
  const dims = elementDimensions(type);
  let x =
    type === "swimlane" ? 0 : world.x - dims.width / 2;
  let y = world.y - dims.height / 2;

  if (snap.snapToGrid) {
    x = snapToGrid(x);
    y = snapToGrid(y);
  }
  if (snap.snapToTimeline && snap.timelineY !== undefined) {
    y = snapToTimeline(y, snap.timelineY);
  }

  return { x, y };
}

/** Place an element at the center of the visible canvas viewport. */
export function placeElementAtViewportCenter(
  type: ElementType,
  options?: { customTypeId?: string },
): void {
  const canvas = document.querySelector<HTMLElement>("[data-storm-canvas]");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;

  const store = useStormBoardStore.getState();
  const world = screenToWorld(store.viewport, clientX, clientY, rect);
  const { x, y } = paletteDropTopLeft(type, world, {
    snapToGrid: store.snapToGrid,
    snapToTimeline: store.snapToTimeline,
    timelineY: store.timeline.y,
  });

  store.setPaletteType(type);
  if (type === "customCard" && options?.customTypeId) {
    store.setPaletteCustomTypeId(options.customTypeId);
  }
  store.addElement(type, x, y, undefined, options);
}
