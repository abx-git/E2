import { describe, expect, it } from "vitest";

import {
  bringElementsForward,
  bringElementsToFront,
  sendElementsBackward,
  sendElementsToBack,
  sortElementsByZOrder,
} from "@/lib/element-z-order";
import type { StormElement } from "@/types/storm-element";

function el(id: string, zIndex?: number): StormElement {
  return {
    id,
    type: "note",
    label: id,
    x: 0,
    y: 0,
    zIndex,
  };
}

describe("element z-order", () => {
  it("sorts by zIndex then id", () => {
    const sorted = sortElementsByZOrder([el("b", 1), el("a", 1), el("c", 0)]);
    expect(sorted.map((e) => e.id)).toEqual(["c", "a", "b"]);
  });

  it("brings selection to front", () => {
    const elements = [el("a", 0), el("b", 1), el("c", 2)];
    expect(bringElementsToFront(elements, ["a"])).toEqual([{ id: "a", zIndex: 3 }]);
  });

  it("sends selection to back", () => {
    const elements = [el("a", 0), el("b", 1), el("c", 2)];
    expect(sendElementsToBack(elements, ["c"])).toEqual([{ id: "c", zIndex: -1 }]);
  });

  it("moves forward / backward one step", () => {
    const elements = [el("a", 0), el("b", 1), el("c", 2)];
    expect(bringElementsForward(elements, ["a"])).toEqual([
      { id: "a", zIndex: 1 },
      { id: "b", zIndex: 0 },
    ]);
    expect(sendElementsBackward(elements, ["c"])).toEqual([
      { id: "c", zIndex: 1 },
      { id: "b", zIndex: 2 },
    ]);
  });
});
