import { isWorkingFileAttached } from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";

/** True if the board has workshop content worth protecting. */
export function boardHasLocalContent(): boolean {
  const s = useStormBoardStore.getState();
  return (
    s.elements.length > 0 ||
    s.relations.length > 0 ||
    s.contextRelations.length > 0 ||
    s.swimlanes.length > 0 ||
    s.boundedContexts.length > 0 ||
    s.glossary.length > 0
  );
}

/** Confirm before entering a room when local work or a working file could be affected. */
export function shouldConfirmCollabEnter(): boolean {
  return isWorkingFileAttached() || boardHasLocalContent();
}
