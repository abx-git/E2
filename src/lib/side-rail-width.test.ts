import { describe, expect, it } from "vitest";

import {
  clampSideRailWidth,
  SIDE_RAIL_WIDTH_MAX,
  SIDE_RAIL_WIDTH_MIN,
} from "@/lib/side-rail-width";

describe("side-rail-width", () => {
  it("clamps to configured bounds", () => {
    expect(clampSideRailWidth(100)).toBe(SIDE_RAIL_WIDTH_MIN);
    expect(clampSideRailWidth(999)).toBe(SIDE_RAIL_WIDTH_MAX);
    expect(clampSideRailWidth(350)).toBe(350);
  });
});
