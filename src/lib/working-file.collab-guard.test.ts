import { afterEach, describe, expect, it } from "vitest";

import {
  getCollabGuestLocalPersistMode,
  isCollabGuestLocalPersistEnabled,
  isWorkingFileToStoreBlocked,
  persistWorkingFileJson,
  setCollabGuestLocalPersistMode,
  setWorkingFileToStoreBlocked,
  shouldSuppressExternalFilePoll,
  suggestedWorkingFileName,
  suppressWorkingFileExternalPoll,
} from "@/lib/working-file";
import {
  ensureWorkingFileWriter,
  stopWorkingFileWriter,
} from "@/lib/working-file-writer";

describe("working-file collab guards", () => {
  afterEach(() => {
    setWorkingFileToStoreBlocked(false);
    setCollabGuestLocalPersistMode("none");
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

  it("tracks collab local persist mode", () => {
    setCollabGuestLocalPersistMode("attached");
    expect(isCollabGuestLocalPersistEnabled()).toBe(true);
    expect(getCollabGuestLocalPersistMode()).toBe("attached");
    setCollabGuestLocalPersistMode("disk");
    expect(getCollabGuestLocalPersistMode()).toBe("disk");
    setCollabGuestLocalPersistMode("none");
    expect(isCollabGuestLocalPersistEnabled()).toBe(false);
  });

  it("builds room-based guest file names", () => {
    expect(suggestedWorkingFileName("Architektur-Review-XY12")).toBe(
      "architektur-review-xy12.e2.json",
    );
  });

  it("persistWorkingFileJson refuses when this tab is not the file writer", async () => {
    const ctrl = ensureWorkingFileWriter("shared.e2.json");
    ctrl.stop();
    const result = await persistWorkingFileJson("{}");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["not_writer", "no_handle", "url_context_mismatch"]).toContain(result.reason);
    }
  });
});
