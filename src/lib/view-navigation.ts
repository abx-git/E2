import type { BoardView } from "@/lib/storm-json";
import type { StormElement } from "@/types/storm-element";

/** Push the view we are leaving onto the return stack (skip no-op hops). */
export function pushViewReturnStack(stack: string[], fromViewId: string, toViewId: string): string[] {
  if (!fromViewId || fromViewId === toViewId) return stack;
  if (stack[stack.length - 1] === fromViewId) return stack;
  return [...stack, fromViewId];
}

export function resolveElementLinkedView(
  el: StormElement,
  views: BoardView[],
): BoardView | null {
  const viewId = el.detailViewId?.trim();
  if (!viewId) return null;
  return views.find((v) => v.id === viewId) ?? null;
}

export function elementHasLinkedView(el: StormElement, views: BoardView[]): boolean {
  return resolveElementLinkedView(el, views) !== null;
}
