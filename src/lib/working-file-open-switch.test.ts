import { afterEach, describe, expect, it } from "vitest";

import {
  buildBoardSnapshot,
  createDefaultBoardDocument,
  stringifyExportedDocument,
} from "@/lib/storm-json";
import {
  beginWorkingFileSwitch,
  endWorkingFileSwitch,
  isWorkingFileSwitchInProgress,
  persistWorkingFileJson,
  setWorkingFilePersistPaused,
} from "@/lib/working-file";
import { stopWorkingFileWriter } from "@/lib/working-file-writer";

function nonemptyJson(title: string): string {
  const doc = createDefaultBoardDocument({ title });
  doc.views[0]!.elements = [
    { id: "e1", type: "domainEvent", label: "Ordered", x: 0, y: 0 },
  ];
  return stringifyExportedDocument(buildBoardSnapshot(doc));
}

describe("working-file open switch gate", () => {
  afterEach(() => {
    endWorkingFileSwitch();
    setWorkingFilePersistPaused(false);
    stopWorkingFileWriter();
  });

  it("blocks autosave while a file switch is in progress", async () => {
    beginWorkingFileSwitch();
    expect(isWorkingFileSwitchInProgress()).toBe(true);
    const result = await persistWorkingFileJson(nonemptyJson("OldBoard"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("persist_paused");
  });

  it("allows skipCas writes during switch (Save As / Create)", async () => {
    beginWorkingFileSwitch();
    // No handle attached → still no_handle, but must not be blocked as persist_paused before gate
    const result = await persistWorkingFileJson(nonemptyJson("New"), { skipCas: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).not.toBe("persist_paused");
  });

  it("clears the switch gate on end", () => {
    beginWorkingFileSwitch();
    endWorkingFileSwitch();
    expect(isWorkingFileSwitchInProgress()).toBe(false);
  });
});
