import { describe, expect, it } from "vitest";

import {
  elementBounds,
  elementsInMarquee,
  rectsIntersect,
  swimlanesInMarquee,
  topRegionInMarquee,
} from "@/lib/selection-geometry";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">): StormElement {
  return {
    type: "domainEvent",
    label: "Test",
    width: 100,
    height: 50,
    ...partial,
  };
}

function lane(
  partial: Partial<Swimlane> & Pick<Swimlane, "id" | "y" | "height">,
): Swimlane {
  return {
    label: "Lane",
    x: 0,
    width: 400,
    ...partial,
  };
}

function bc(
  partial: Partial<BoundedContext> & Pick<BoundedContext, "id" | "x" | "y" | "width" | "height">,
): BoundedContext {
  return {
    label: "BC",
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

  it("selects swimlanes overlapping a marquee", () => {
    const lanes = [
      lane({ id: "l1", y: 0, height: 100 }),
      lane({ id: "l2", y: 200, height: 100 }),
    ];
    expect(swimlanesInMarquee(lanes, { x: 10, y: 20, w: 50, h: 40 })).toEqual(["l1"]);
    expect(swimlanesInMarquee(lanes, { x: 10, y: 220, w: 50, h: 40 })).toEqual(["l2"]);
    expect(swimlanesInMarquee(lanes, { x: 10, y: 120, w: 50, h: 40 })).toEqual([]);
  });

  it("picks the topmost region in a marquee by z-order", () => {
    const lanes = [lane({ id: "l1", y: 0, height: 200, zIndex: 0 })];
    const contexts = [bc({ id: "bc1", x: 20, y: 20, width: 100, height: 80, zIndex: 2 })];
    expect(topRegionInMarquee(lanes, contexts, { x: 30, y: 30, w: 40, h: 40 })).toEqual({
      kind: "boundedContext",
      id: "bc1",
    });
    expect(topRegionInMarquee(lanes, [], { x: 30, y: 30, w: 40, h: 40 })).toEqual({
      kind: "swimlane",
      id: "l1",
    });
  });
});
