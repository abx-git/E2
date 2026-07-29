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
 * Same idea as must-save-before-open: create room only with a secured board
 * (Arbeitsdatei attached + clean). That file is then written in parallel during collab.
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
    return "Zuerst „Speichern unter…“ — der Raum braucht ein Sync-Ziel, das parallel mitgeschrieben wird.";
  }
  if (isWorkingFileDirty()) {
    return "Zuerst speichern — Raum erstellen nur mit gesichertem Stand.";
  }
  return "";
}
