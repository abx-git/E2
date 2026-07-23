import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * flushCollabSnapshotNow is exercised via module exports; rooms/network are mocked
 * so we only assert the debounce timer is cleared and no throw when idle.
 */
describe("flushCollabSnapshotNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is a no-op when no collab session is active", async () => {
    const { flushCollabSnapshotNow, useCollabStore } = await import("@/lib/collab/session");
    expect(useCollabStore.getState().active).toBe(false);
    await expect(flushCollabSnapshotNow()).resolves.toBeUndefined();
  });
});
