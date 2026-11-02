import { describe, expect, it } from "vitest";

import { paletteDropTopLeft } from "@/lib/place-element-on-canvas";

describe("paletteDropTopLeft", () => {
  it("centers card-like types on the pointer", () => {
    const { x, y } = paletteDropTopLeft("note", { x: 300, y: 200 });
    expect(x).toBe(300 - 160 / 2);
    expect(y).toBe(200 - 100 / 2);
  });

  it("anchors swimlanes at x=0 and centers vertically on the pointer", () => {
    const { x, y } = paletteDropTopLeft("swimlane", { x: 900, y: 400 });
    expect(x).toBe(0);
    expect(y).toBe(400 - 160 / 2);
  });
});
