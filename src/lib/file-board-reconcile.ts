import {
  boardExportTextsEquivalent,
  boardImportPayloadFromExportText,
  buildBoardSnapshot,
  documentHasContent,
  stableBoardStateKey,
  stringifyExportedDocument,
  viewHasContent,
  type BoardSnapshot,
  type BoardImportPayload,
} from "@/lib/storm-json";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";
import { useStormBoardStore } from "@/store/storm-board-store";

export type FileConflictChoice = "load_file" | "keep_local";

export type FileReconcilePlan =
  | { action: "in_sync" }
  | { action: "apply_file" }
  | { action: "push_local" }
  | { action: "conflict" };

function isEmptyPayload(payload: BoardImportPayload | null): boolean {
  return !payload || !documentHasContent(payload);
}

export function planFileReconcile(localJson: string, fileJson: string): FileReconcilePlan {
  if (boardExportTextsEquivalent(localJson, fileJson)) {
    return { action: "in_sync" };
  }

  const localPayload = boardImportPayloadFromExportText(localJson);
  const filePayload = boardImportPayloadFromExportText(fileJson);

  if (isEmptyPayload(localPayload) && filePayload && documentHasContent(filePayload)) {
    return { action: "apply_file" };
  }

  if (isEmptyPayload(filePayload) && localPayload && documentHasContent(localPayload)) {
    return { action: "push_local" };
  }

  if (!fileJson.trim() && localJson.trim()) return { action: "push_local" };
  if (fileJson.trim() && !localJson.trim()) return { action: "apply_file" };

  return { action: "conflict" };
}

export function applyBoardPayloadToStore(payload: BoardImportPayload): void {
  useStormBoardStore.getState().replaceBoardFromImport(payload);
}

export function applyBoardJsonToStore(json: string): boolean {
  const payload = boardImportPayloadFromExportText(json);
  if (!payload) return false;
  applyBoardPayloadToStore(payload);
  return true;
}

export function boardJsonFromStoreState(): string {
  return stringifyExportedDocument(buildBoardSnapshot(boardImportPayloadFromStore()));
}

export function parseBoardSnapshotFromText(text: string): BoardSnapshot | null {
  const payload = boardImportPayloadFromExportText(text);
  if (!payload) return null;
  return buildBoardSnapshot(payload);
}

export function boardStatesEquivalent(a: string, b: string): boolean {
  return boardExportTextsEquivalent(a, b);
}

export function boardPersistKeyFromStoreState(): string {
  return stableBoardStateKey(boardImportPayloadFromStore());
}

export { viewHasContent, documentHasContent };
