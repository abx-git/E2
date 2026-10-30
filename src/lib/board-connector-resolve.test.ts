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

  it("ignores stale approach points and still aims at opposite centers", () => {
    const source = el({ id: "s", x: 0, y: 0 });
    const target = el({ id: "t", x: 200, y: 80 });

    const { start, end } = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s", approach: { x: 10, y: 5 } },
        target: { attach: "element", id: "t", approach: { x: 250, y: 120 } },
      },
      [source, target],
      [],
      [],
    );

    // Horizontal mid of source right edge → left edge of target (center-to-center ray).
    expect(start.x).toBeCloseTo(100, 0);
    expect(end.x).toBeCloseTo(200, 0);
    expect(start.y).toBeGreaterThan(20);
    expect(end.y).toBeLessThan(100);
  });

  it("anchors vertically stacked cards at top/bottom edges", () => {
    const source = el({ id: "s", x: 0, y: 0, width: 100, height: 40 });
    const target = el({ id: "t", x: 0, y: 120, width: 100, height: 40 });

    const { start, end } = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s" },
        target: { attach: "element", id: "t" },
      },
      [source, target],
      [],
      [],
    );

    expect(start.x).toBeCloseTo(50, 0);
    expect(end.x).toBeCloseTo(50, 0);
    expect(start.y).toBeCloseTo(40, 0);
    expect(end.y).toBeCloseTo(120, 0);
  });

  it("aims source anchor at the first waypoint and target at the last", () => {
    const source = el({ id: "s", x: 0, y: 0, width: 100, height: 40 });
    const target = el({ id: "t", x: 200, y: 0, width: 100, height: 40 });

    const straight = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s" },
        target: { attach: "element", id: "t" },
      },
      [source, target],
      [],
      [],
    );

    const bent = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s" },
        target: { attach: "element", id: "t" },
        waypoints: [{ x: 50, y: -60 }],
      },
      [source, target],
      [],
      [],
    );

    expect(straight.start.y).toBeCloseTo(20, 0);
    expect(bent.start.y).toBeLessThan(straight.start.y);
    expect(bent.start.x).toBeCloseTo(50, 0);
  });

  it("docks target on the edge facing the last waypoint along the incoming segment", () => {
    const source = el({ id: "s", x: 0, y: 0, width: 100, height: 40 });
    const target = el({ id: "t", x: 200, y: 80, width: 100, height: 40 });
    const lastWp = { x: 40, y: -20 };

    const { end } = resolveConnectorAnchors(
      {
        source: { attach: "element", id: "s" },
        target: { attach: "element", id: "t" },
        waypoints: [lastWp],
      },
      [source, target],
      [],
      [],
    );

    // Incoming from lastWp toward target center hits the top edge (not the left edge from center→wp).
    expect(end.y).toBeCloseTo(80, 0);
    expect(end.x).toBeCloseTo(215, 0);
    expect(end.x).toBeGreaterThan(200);
    expect(end.x).toBeLessThan(250);
  });
});
