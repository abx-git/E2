import { afterEach, describe, expect, it } from "vitest";

import {
  isWorkingFileToStoreBlocked,
  persistWorkingFileJson,
  setWorkingFileToStoreBlocked,
  shouldSuppressExternalFilePoll,
  suppressWorkingFileExternalPoll,
} from "@/lib/working-file";
import {
  ensureWorkingFileWriter,
  stopWorkingFileWriter,
} from "@/lib/working-file-writer";

describe("working-file collab guards", () => {
  afterEach(() => {
    setWorkingFileToStoreBlocked(false);
    stopWorkingFileWriter();
  });

  it("blocks and unblocks file→store", () => {
    setWorkingFileToStoreBlocked(true);
    expect(isWorkingFileToStoreBlocked()).toBe(true);
    setWorkingFileToStoreBlocked(false);
    expect(isWorkingFileToStoreBlocked()).toBe(false);
  });

  it("extends external poll suppression", () => {
    suppressWorkingFileExternalPoll(5_000);
    expect(shouldSuppressExternalFilePoll()).toBe(true);
  });

  it("persistWorkingFileJson refuses when this tab is not the file writer", async () => {
    const ctrl = ensureWorkingFileWriter("shared.storm.json");
    ctrl.stop();
    const result = await persistWorkingFileJson("{}");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["not_writer", "url_context_missing", "no_handle"]).toContain(result.reason);
    }
  });
});
