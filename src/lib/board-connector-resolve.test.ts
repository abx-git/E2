import { describe, expect, it } from "vitest";

import { resolveConnectorAnchors } from "@/lib/board-connector-resolve";
import type { StormElement } from "@/types/storm-element";

function el(overrides: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">): StormElement {
  return {
    type: "domainEvent",
    label: "Test",
    width: 100,
    height: 40,
    ...overrides,
  };
}

describe("resolveConnectorAnchors", () => {
  it("anchors element connectors on edges toward the opposite element center", () => {
    const source = el({ id: "s", x: 0, y: 0 });
    const target = el({ id: "t", x: 200, y: 0 });

    const { start, end } = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s" },
        target: { attach: "element", id: "t" },
      },
      [source, target],
      [],
      [],
    );

    expect(start.x).toBeCloseTo(100, 0);
    expect(end.x).toBeCloseTo(200, 0);
    expect(start.y).toBeCloseTo(20, 0);
    expect(end.y).toBeCloseTo(20, 0);
  });

  it("uses approach point to pick the attachment edge", () => {
    const source = el({ id: "s", x: 0, y: 0 });
    const target = el({ id: "t", x: 200, y: 80 });

    const { end } = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s" },
        target: { attach: "element", id: "t", approach: { x: 250, y: 120 } },
      },
      [source, target],
      [],
      [],
    );

    expect(end.y).toBeGreaterThan(100);
    expect(end.x).toBeCloseTo(250, 0);
  });
});
