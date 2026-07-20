import { describe, expect, it } from "vitest";

import { elementBounds, elementsInMarquee, rectsIntersect } from "@/lib/selection-geometry";
import type { StormElement } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">): StormElement {
  return {
    type: "domainEvent",
    label: "Test",
    width: 100,
    height: 50,
    ...partial,
  };
}

describe("selection-geometry", () => {
  it("detects intersecting rectangles", () => {
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 })).toBe(false);
  });

  it("selects elements overlapping a marquee", () => {
    const elements = [
      el({ id: "a", x: 0, y: 0 }),
      el({ id: "b", x: 200, y: 0 }),
      el({ id: "c", x: 50, y: 100 }),
    ];
    expect(elementsInMarquee(elements, { x: 0, y: 0, w: 120, h: 60 })).toEqual(["a"]);
    expect(elementsInMarquee(elements, { x: 0, y: 0, w: 250, h: 60 }).sort()).toEqual(["a", "b"]);
    expect(elementsInMarquee(elements, { x: 40, y: 80, w: 80, h: 80 })).toEqual(["c"]);
  });

  it("uses default dimensions when width/height missing", () => {
    const bounds = elementBounds(
      el({ id: "a", x: 10, y: 20, width: undefined, height: undefined, type: "actor" }),
    );
    expect(bounds.w).toBeGreaterThan(0);
    expect(bounds.h).toBeGreaterThan(0);
  });
});
