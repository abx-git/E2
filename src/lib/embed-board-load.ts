import { applyBoardJsonToStore, applyBoardPayloadToStore } from "@/lib/file-board-reconcile";
import { boardImportPayloadFromAnyExportText } from "@/lib/board-import-text";
import type { BoardImportPayload } from "@/lib/storm-json";
import { fetchAndValidateRemoteBoard } from "@/lib/board-remote-url";
import { loadForeignBoardIntoEditor, setWorkingFilePersistPaused } from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";

export type EmbedBoardLoadOptions = {
  interactionMode?: "edit" | "view";
  editable?: boolean;
};

export function applyEmbedBoardLoadOptions(opts?: EmbedBoardLoadOptions): void {
  const interactionMode = opts?.editable ? "edit" : (opts?.interactionMode ?? "view");
  const store = useStormBoardStore.getState();
  store.setInteractionMode(interactionMode);
  store.setElementsPanelOpen(false);
  store.setPropertiesPanelOpen(true);
  setWorkingFilePersistPaused(true);
}

export function loadEmbedBoardFromText(json: string, opts?: EmbedBoardLoadOptions): boolean {
  const payload = boardImportPayloadFromAnyExportText(json);
  if (!payload) return false;
  applyEmbedBoardLoadOptions(opts);
  loadForeignBoardIntoEditor(json, { reason: "embed" });
  return true;
}

export function loadEmbedBoardFromPayload(
  payload: BoardImportPayload,
  opts?: EmbedBoardLoadOptions,
): void {
  applyEmbedBoardLoadOptions(opts);
  setWorkingFilePersistPaused(true);
  applyBoardPayloadToStore(payload);
}

export async function loadEmbedBoardFromUrl(
  url: string,
  opts?: EmbedBoardLoadOptions & { signal?: AbortSignal },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const outcome = await fetchAndValidateRemoteBoard(url, { signal: opts?.signal });
  if (!outcome.ok) return outcome;
  applyEmbedBoardLoadOptions(opts);
  const loaded = applyBoardJsonToStore(outcome.rawText);
  if (!loaded) {
    return { ok: false, reason: "Invalid board JSON" };
  }
  setWorkingFilePersistPaused(true);
  return { ok: true };
}
