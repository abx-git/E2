import { describe, expect, it } from "vitest";

import { viewportFitContent } from "@/lib/canvas-viewport";

describe("viewportFitContent", () => {
  it("centers content and scales to fit", () => {
    const vp = viewportFitContent({ x: 100, y: 100, w: 200, h: 100 }, 400, 300, 0);
    expect(vp.zoom).toBe(2);
    expect(vp.x).toBe(-200);
    expect(vp.y).toBe(-150);
  });
});
