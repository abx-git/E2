import { isActionsView, type BoardView } from "@/lib/storm-json";
import type { ActionsView } from "@/types/actions-view";

export function listActionsViews(views: BoardView[]): ActionsView[] {
  return views.filter((v): v is ActionsView => isActionsView(v));
}

/** Prefer the active tab when it is an actions view; otherwise the first measures view. */
export function resolveDefaultActionsViewId(
  views: BoardView[],
  activeViewId: string,
): string | null {
  const actions = listActionsViews(views);
  if (actions.length === 0) return null;
  const active = actions.find((v) => v.id === activeViewId);
  return active?.id ?? actions[0]!.id;
}
