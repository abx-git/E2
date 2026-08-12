import { describe, expect, it } from "vitest";

import {
  normalizeProgressMark,
  progressMarkFromDigit,
  toggleProgressMark,
} from "@/lib/progress-mark";

describe("progress-mark", () => {
  it("maps Ctrl digits to marks", () => {
    expect(progressMarkFromDigit("1")).toBe("ok");
    expect(progressMarkFromDigit("2")).toBe("attention");
    expect(progressMarkFromDigit("3")).toBe("question");
    expect(progressMarkFromDigit("4")).toBe("working");
    expect(progressMarkFromDigit("5")).toBe("neu");
    expect(progressMarkFromDigit("6")).toBeNull();
  });

  it("normalizes legacy pending to working", () => {
    expect(normalizeProgressMark("pending")).toBe("working");
    expect(normalizeProgressMark("neu")).toBe("neu");
    expect(normalizeProgressMark("nope")).toBeUndefined();
  });

  it("toggles the same mark off", () => {
    expect(toggleProgressMark("ok", "ok")).toBeUndefined();
    expect(toggleProgressMark(undefined, "ok")).toBe("ok");
    expect(toggleProgressMark("ok", "attention")).toBe("attention");
  });
});
