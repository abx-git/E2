import { describe, expect, it } from "vitest";

import {
  chamferClipPathCss,
  chamferPolygonPoints,
  gatewayChamferCutPx,
} from "@/lib/element-chamfer-shape";

describe("element-chamfer-shape", () => {
  it("produces an eight-point chamfer for gateways", () => {
    expect(chamferPolygonPoints(100, 80)).toHaveLength(8);
    expect(gatewayChamferCutPx(100, 80)).toBeGreaterThan(0);
    expect(chamferClipPathCss(170, 80)).toMatch(/^polygon\(/);
  });
});
