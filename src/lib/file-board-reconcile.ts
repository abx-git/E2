import {
  boardExportTextsEquivalent,
  boardImportPayloadFromExportText,
  buildBoardSnapshot,
  isBoardSnapshot,
  parseExportedDocument,
  stableBoardStateKey,
  stringifyExportedDocument,
  type BoardSnapshotV1,
} from "@/lib/storm-json";
import { boardImportPayloadFromStore } from "@/store/storm-board-store";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { BoardImportPayload } from "@/lib/storm-json";

export type FileConflictChoice = "load_file" | "keep_local";

export type FileReconcilePlan =
  | { action: "in_sync" }
  | { action: "apply_file" }
  | { action: "push_local" }
  | { action: "conflict" };

function isEmptyPayload(payload: BoardImportPayload | null): boolean {
  return !payload || (payload.elements.length === 0 && payload.relations.length === 0);
}

export function planFileReconcile(localJson: string, fileJson: string): FileReconcilePlan {
  if (boardExportTextsEquivalent(localJson, fileJson)) {
    return { action: "in_sync" };
  }

  const localPayload = boardImportPayloadFromExportText(localJson);
  const filePayload = boardImportPayloadFromExportText(fileJson);

  if (isEmptyPayload(localPayload) && filePayload && filePayload.elements.length > 0) {
    return { action: "apply_file" };
  }

  if (isEmptyPayload(filePayload) && localPayload && localPayload.elements.length > 0) {
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

export function parseBoardSnapshotFromText(text: string): BoardSnapshotV1 | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const doc = parseExportedDocument(trimmed);
    return isBoardSnapshot(doc) ? doc : null;
  } catch {
    return null;
  }
}

export function boardStatesEquivalent(a: string, b: string): boolean {
  return boardExportTextsEquivalent(a, b);
}

export function boardPersistKeyFromStoreState(): string {
  return stableBoardStateKey(boardImportPayloadFromStore());
}
