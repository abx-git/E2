import { describe, expect, it, vi } from "vitest";
import { createDrawioStoreSyncCoalescer } from "@/lib/drawio/sync-coalesce";

describe("drawio sync coalesce", () => {
  it("batches rapid schedules", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const { schedule, flush } = createDrawioStoreSyncCoalescer(run, 100);
    schedule();
    schedule();
    schedule();
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(run).toHaveBeenCalledTimes(1);
    flush();
    expect(run.mock.calls.length).toBeLessThanOrEqual(2);
    vi.useRealTimers();
  });
});