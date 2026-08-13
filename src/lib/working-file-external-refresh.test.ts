import { describe, expect, it } from "vitest";

import {
  EXTERNAL_WORKING_FILE_POLL_MS,
  clearWorkingFileSyncState,
  isKnownFileRevision,
  markWorkingFileSynced,
} from "@/lib/working-file";

describe("external working-file refresh", () => {
  it("polls at a short visible-tab interval", () => {
    expect(EXTERNAL_WORKING_FILE_POLL_MS).toBeGreaterThanOrEqual(500);
    expect(EXTERNAL_WORKING_FILE_POLL_MS).toBeLessThanOrEqual(3000);
  });

  it("treats a newer mtime as unknown revision", () => {
    clearWorkingFileSyncState();
    markWorkingFileSynced("{}", 1000);
    expect(isKnownFileRevision(1000)).toBe(true);
    expect(isKnownFileRevision(1001)).toBe(false);
  });
});
