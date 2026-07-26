import { describe, expect, it } from "vitest";

import {
  boundedContextCenter,
  contextRelationAnchors,
  elementCenter,
  relationAnchors,
} from "@/lib/connector-geometry";
import type { BoundedContext, StormElement } from "@/types/storm-element";

function el(overrides: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">): StormElement {
  return {
    type: "domainEvent",
    label: "Test",
    ...overrides,
  };
}

function bc(
  overrides: Partial<BoundedContext> & Pick<BoundedContext, "id" | "x" | "y" | "width" | "height">,
): BoundedContext {
  return {
    label: "BC",
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

  it("anchors context-map relations on bounded-context edges", () => {
    const source = bc({ id: "s", x: 0, y: 0, width: 200, height: 120 });
    const target = bc({ id: "t", x: 400, y: 0, width: 200, height: 120 });

    const { start, end } = contextRelationAnchors(source, target);

    expect(start.x).toBeCloseTo(200, 5);
    expect(end.x).toBeCloseTo(400, 5);
    expect(start.y).toBeCloseTo(boundedContextCenter(source).y, 5);
    expect(end.y).toBeCloseTo(boundedContextCenter(target).y, 5);
  });
});
