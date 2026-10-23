import { isActionsView, type BoardView } from "@/lib/storm-json";
import type { MeasureActionItem } from "@/types/actions-view";

export function selectMeasureItem(
  views: BoardView[],
  viewId: string,
  itemId: string,
): MeasureActionItem | null {
  const view = views.find((v) => v.id === viewId);
  if (!view || !isActionsView(view)) return null;
  return view.items.find((i) => i.id === itemId) ?? null;
}
