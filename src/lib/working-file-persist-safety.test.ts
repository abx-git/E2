import { afterEach, describe, expect, it } from "vitest";

import {
  buildBoardSnapshot,
  createDefaultBoardDocument,
  stringifyExportedDocument,
} from "@/lib/storm-json";
import {
  clearWorkingFileSyncState,
  getLastSyncedContentHash,
  isWorkingFileDirty,
  isWorkingFilePersistPaused,
  loadForeignBoardIntoEditor,
  markWorkingFileSynced,
  persistWorkingFileJson,
  setWorkingFilePersistPaused,
} from "@/lib/working-file";
import { boardContentHash } from "@/lib/working-file-write-fence";
import { useStormBoardStore } from "@/store/storm-board-store";
import { stopWorkingFileWriter } from "@/lib/working-file-writer";

function nonemptyJson(title = "Workshop"): string {
  const doc = createDefaultBoardDocument({ title });
  doc.views[0]!.elements = [
    { id: "e1", type: "domainEvent", label: "Ordered", x: 0, y: 0 },
  ];
  return stringifyExportedDocument(buildBoardSnapshot(doc));
}

describe("working-file foreign load + pause", () => {
  afterEach(() => {
    setWorkingFilePersistPaused(false);
    clearWorkingFileSyncState();
    stopWorkingFileWriter();
    useStormBoardStore.getState().replaceBoardFromImport(createDefaultBoardDocument({ title: "" }));
  });

  it("loadForeignBoardIntoEditor pauses persist and does not report dirty vs file", () => {
    const json = nonemptyJson("Backup");
    expect(loadForeignBoardIntoEditor(json, { reason: "backup" })).toBe(true);
    expect(isWorkingFilePersistPaused()).toBe(true);
    expect(useStormBoardStore.getState().title).toBe("Backup");
    // Not attached → not dirty; pause also forces not dirty.
    expect(isWorkingFileDirty()).toBe(false);
  });

  it("persistWorkingFileJson refuses while paused", async () => {
    setWorkingFilePersistPaused(true, "foreign_load");
    const result = await persistWorkingFileJson(nonemptyJson());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("persist_paused");
  });

  it("marks content hash when synced", () => {
    const json = nonemptyJson("Synced");
    markWorkingFileSynced(json, 123);
    expect(getLastSyncedContentHash()).toBe(boardContentHash(json));
  });
});
