import { describe, expect, it } from "vitest";
import { layoutPatchesFromMxCells, selectionFromMxCells } from "@/lib/drawio/mx-to-board";

const bounds = {
  minX: 0,
  minY: 0,
  maxX: 400,
  maxY: 300,
  width: 480,
  height: 380,
  ox: 40,
  oy: 40,
};

describe("mx-to-board", () => {
  it("maps mx geometry back to world coordinates", () => {
    const patches = layoutPatchesFromMxCells(
      [
        {
          id: "el_evt-1",
          vertex: true,
          style: "e2Kind=element;e2Id=evt-1",
          geometry: { x: 140, y: 110, width: 160, height: 72 },
        },
      ],
      bounds,
    );
    expect(patches.elements).toEqual([
      { id: "evt-1", x: 100, y: 70, width: 160, height: 72 },
    ]);
  });

  it("derives selection from cells", () => {
    const sel = selectionFromMxCells([
      { id: "el_a", style: "e2Kind=element;e2Id=a" },
      { id: "bc_b", style: "e2Kind=boundedContext;e2Id=b" },
    ]);
    expect(sel.elementIds).toEqual(["a"]);
    expect(sel.boundedContextIds).toEqual(["b"]);
  });
});