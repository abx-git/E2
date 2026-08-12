import { elementDimensions } from "@/lib/element-styles";
import { screenToWorld, snapToGrid, snapToTimeline } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ElementType } from "@/types/storm-element";

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
  const dims = elementDimensions(type);
  let x = world.x - dims.width / 2;
  let y = world.y - dims.height / 2;

  if (store.snapToGrid) {
    x = snapToGrid(x);
    y = snapToGrid(y);
  }
  if (store.snapToTimeline) {
    y = snapToTimeline(y, store.timeline.y);
  }

  store.setPaletteType(type);
  if (type === "customCard" && options?.customTypeId) {
    store.setPaletteCustomTypeId(options.customTypeId);
  }
  store.addElement(type, x, y, undefined, options);
}
