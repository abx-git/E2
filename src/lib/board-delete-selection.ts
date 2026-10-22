import type { useStormBoardStore } from "@/store/storm-board-store";

type BoardStore = ReturnType<typeof useStormBoardStore.getState>;

export type DeleteSelectionState = Pick<
  BoardStore,
  | "selectedConnectorId"
  | "selectedRelationId"
  | "selectedContextRelationId"
  | "selectedCanvasLineId"
  | "selectedElementIds"
  | "selectedSwimlaneIds"
  | "selectedBoundedContextIds"
>;

/** Which board item Delete / Backspace should remove (priority order). */
export function deleteSelectionTarget(state: DeleteSelectionState): 
  | { kind: "connector"; id: string }
  | { kind: "elements"; ids: string[] }
  | { kind: "swimlanes"; ids: string[] }
  | { kind: "boundedContexts"; ids: string[] }
  | null {
  const connectorId =
    state.selectedConnectorId ??
    state.selectedRelationId ??
    state.selectedContextRelationId ??
    state.selectedCanvasLineId;
  if (connectorId) return { kind: "connector", id: connectorId };

  if (state.selectedElementIds.length > 0) {
    return { kind: "elements", ids: [...state.selectedElementIds] };
  }
  if (state.selectedSwimlaneIds.length > 0) {
    return { kind: "swimlanes", ids: [...state.selectedSwimlaneIds] };
  }
  if (state.selectedBoundedContextIds.length > 0) {
    return { kind: "boundedContexts", ids: [...state.selectedBoundedContextIds] };
  }
  return null;
}

/** Apply delete for the current canvas selection (single undo step when possible). */
export function deleteCurrentSelection(store: BoardStore): boolean {
  const target = deleteSelectionTarget(store);
  if (!target) return false;

  store.beginGesture();
  try {
    if (target.kind === "connector") {
      store.deleteConnector(target.id);
    } else if (target.kind === "elements") {
      for (const id of target.ids) store.deleteElement(id);
      store.clearSelection();
    } else if (target.kind === "swimlanes") {
      for (const id of target.ids) store.deleteSwimlane(id);
      store.clearSelection();
    } else {
      for (const id of target.ids) store.deleteBoundedContext(id);
      store.clearSelection();
    }
  } finally {
    store.endGesture();
  }
  return true;
}
