import { describe, expect, it } from "vitest";

import {
  progressMarkFromDigit,
  toggleProgressMark,
} from "@/lib/progress-mark";

describe("progress-mark", () => {
  it("maps Ctrl digits to marks", () => {
    expect(progressMarkFromDigit("1")).toBe("ok");
    expect(progressMarkFromDigit("2")).toBe("attention");
    expect(progressMarkFromDigit("3")).toBe("pending");
    expect(progressMarkFromDigit("4")).toBeNull();
  });

  it("toggles the same mark off", () => {
    expect(toggleProgressMark("ok", "ok")).toBeUndefined();
    expect(toggleProgressMark(undefined, "ok")).toBe("ok");
    expect(toggleProgressMark("ok", "attention")).toBe("attention");
  });
});
