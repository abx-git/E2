import { collabT } from "@/lib/collab/i18n";
import { isWorkingFileAttached, isWorkingFileDirty } from "@/lib/working-file";
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

/**
 * Create room only with a secured board (Arbeitsdatei attached + clean).
 * Host: that file is mirrored continuously while the room syncs. Guests choose disk copy or online-only.
 */
export function mustSecureBeforeCreateRoom(): boolean {
  return !isWorkingFileAttached() || isWorkingFileDirty();
}

export function canCreateCollabRoom(): boolean {
  return !mustSecureBeforeCreateRoom();
}

/** Short UI hint when create is blocked. */
export function createRoomBlockedHint(): string {
  if (!isWorkingFileAttached()) {
    return collabT("alerts.collabCreateNeedsSaveAs");
  }
  if (isWorkingFileDirty()) {
    return collabT("alerts.collabCreateNeedsSave");
  }
  return "";
}
