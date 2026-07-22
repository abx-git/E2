import { isWorkingFileAttached } from "@/lib/working-file";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";
import { documentHasContent } from "@/lib/storm-json";

/** True if the board has workshop content worth protecting. */
export function boardHasLocalContent(): boolean {
  return documentHasContent(boardImportPayloadFromStore());
}

/** Confirm before entering a room when local work or a working file could be affected. */
export function shouldConfirmCollabEnter(): boolean {
  return isWorkingFileAttached() || boardHasLocalContent();
}
