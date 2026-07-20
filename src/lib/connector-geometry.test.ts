import { describe, expect, it } from "vitest";

import { elementCenter, relationAnchors } from "@/lib/connector-geometry";
import type { StormElement } from "@/types/storm-element";

function el(overrides: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">): StormElement {
  return {
    type: "domainEvent",
    label: "Test",
    ...overrides,
  };
}

describe("connector-geometry", () => {
  it("anchors relations on rectangle edges instead of centers", () => {
    const source = el({ id: "s", x: 0, y: 0, width: 100, height: 40 });
    const target = el({ id: "t", x: 200, y: 0, width: 100, height: 40 });

    const { start, end } = relationAnchors(source, target);

    expect(start.x).toBeGreaterThan(elementCenter(source).x);
    expect(end.x).toBeLessThan(elementCenter(target).x);
    expect(start.y).toBeCloseTo(elementCenter(source).y, 5);
    expect(end.y).toBeCloseTo(elementCenter(target).y, 5);
  });
});
