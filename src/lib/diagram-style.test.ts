import { describe, expect, it } from "vitest";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { isScribbleDiagram, normalizeDiagramStyle, scribbleStrokeFilter } from "@/lib/diagram-style";

describe("diagram-style", () => {
  it("normalizes diagram style", () => {
    expect(normalizeDiagramStyle("scribble")).toBe("scribble");
    expect(normalizeDiagramStyle("clean")).toBe("clean");
    expect(normalizeDiagramStyle(undefined)).toBe("clean");
  });

  it("exposes scribble stroke filter only in scribble mode", () => {
    expect(scribbleStrokeFilter(DEFAULT_APPEARANCE)).toBeUndefined();
    expect(scribbleStrokeFilter({ ...DEFAULT_APPEARANCE, diagramStyle: "scribble" })).toBe(
      "url(#e2-scribble-stroke)",
    );
    expect(isScribbleDiagram({ ...DEFAULT_APPEARANCE, diagramStyle: "scribble" })).toBe(true);
  });
});
