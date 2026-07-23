import { describe, expect, it } from "vitest";

import {
  isWorkingFileToStoreBlocked,
  setWorkingFileToStoreBlocked,
  shouldSuppressExternalFilePoll,
  suppressWorkingFileExternalPoll,
} from "@/lib/working-file";

describe("working-file collab guards", () => {
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
});
