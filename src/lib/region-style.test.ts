import { describe, expect, it } from "vitest";

import {
  hexToRgba,
  percentToOpacity,
  resolveRegionPaint,
  sanitizeRegionGeometryPatch,
} from "@/lib/region-style";

describe("region-style", () => {
  it("resolves swimlane defaults", () => {
    const paint = resolveRegionPaint("swimlane", {});
    expect(paint.fillHex).toBe("#94a3b8");
    expect(paint.fillOpacity).toBeCloseTo(0.12);
    expect(paint.borderHex).toBe("#cbd5e1");
    expect(paint.locked).toBe(false);
  });

  it("uses legacy rgba color alpha for fill when fillOpacity omitted", () => {
    const paint = resolveRegionPaint("swimlane", {
      color: "rgba(148,163,184,0.18)",
    });
    expect(paint.fillHex).toBe("#94a3b8");
    expect(paint.fillOpacity).toBeCloseTo(0.18);
  });

  it("applies explicit opacities and border", () => {
    const paint = resolveRegionPaint("boundedContext", {
      color: "#aabbcc",
      fillOpacity: 0.25,
      borderColor: "#112233",
      borderOpacity: 0.5,
      locked: true,
    });
    expect(paint.backgroundColor).toBe(hexToRgba("#aabbcc", 0.25));
    expect(paint.borderColor).toBe(hexToRgba("#112233", 0.5));
    expect(paint.locked).toBe(true);
  });

  it("sanitizes geometry while locked", () => {
    expect(
      sanitizeRegionGeometryPatch(true, { x: 1, y: 2, label: "A", fillOpacity: 0.5 }),
    ).toEqual({ label: "A", fillOpacity: 0.5 });
    expect(sanitizeRegionGeometryPatch(true, { locked: false, x: 9 })).toEqual({
      locked: false,
      x: 9,
    });
    expect(percentToOpacity(50)).toBeCloseTo(0.5);
  });
});
