import { describe, expect, it } from "vitest";

import {
  connectorEndpointDragPreview,
  pickInnermostConnectorTargetAt,
} from "@/lib/connector-target-pick";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">): StormElement {
  return {
    type: "domainEvent",
    label: "E",
    width: 100,
    height: 50,
    ...partial,
  };
}

describe("pickInnermostConnectorTargetAt", () => {
  it("prefers the smallest containing object", () => {
    const elements = [el({ id: "inner", x: 50, y: 50, width: 40, height: 30 })];
    const swimlanes: Swimlane[] = [
      { id: "lane", label: "L", x: 0, y: 0, width: 400, height: 200 },
    ];
    const boundedContexts: BoundedContext[] = [
      { id: "bc", label: "BC", x: 20, y: 20, width: 200, height: 120 },
    ];

    expect(
      pickInnermostConnectorTargetAt({ x: 60, y: 60 }, elements, swimlanes, boundedContexts),
    ).toEqual({ kind: "element", id: "inner" });
  });

  it("picks bounded context over swimlane when no element matches", () => {
    const swimlanes: Swimlane[] = [
      { id: "lane", label: "L", x: 0, y: 0, width: 400, height: 200 },
    ];
    const boundedContexts: BoundedContext[] = [
      { id: "bc", label: "BC", x: 20, y: 20, width: 200, height: 120 },
    ];

    expect(
      pickInnermostConnectorTargetAt({ x: 30, y: 30 }, [], swimlanes, boundedContexts),
    ).toEqual({ kind: "boundedContext", id: "bc" });
  });

  it("snaps preview to element edge when accepted", () => {
    const elements = [el({ id: "inner", x: 100, y: 100, width: 80, height: 40 })];
    const preview = connectorEndpointDragPreview(
      { x: 120, y: 120 },
      { x: 0, y: 120 },
      elements,
      [],
      [],
      "element",
    );
    expect(preview.valid).toBe(true);
    expect(preview.target).toEqual({ kind: "element", id: "inner" });
    expect(preview.lineEnd.x).toBeLessThan(120);
    expect(preview.lineEnd.y).toBeCloseTo(120, 5);
  });

  it("marks preview invalid for swimlane when only elements are accepted", () => {
    const swimlanes: Swimlane[] = [
      { id: "lane", label: "L", x: 0, y: 0, width: 400, height: 200 },
    ];
    const preview = connectorEndpointDragPreview(
      { x: 50, y: 50 },
      { x: 300, y: 50 },
      [],
      swimlanes,
      [],
      "element",
    );
    expect(preview.valid).toBe(false);
    expect(preview.target).toEqual({ kind: "swimlane", id: "lane" });
    expect(preview.lineEnd).toEqual({ x: 50, y: 50 });
  });

  it("returns swimlane when only the lane contains the point", () => {
    const swimlanes: Swimlane[] = [
      { id: "lane", label: "L", x: 0, y: 0, width: 400, height: 200 },
    ];

    expect(pickInnermostConnectorTargetAt({ x: 300, y: 150 }, [], swimlanes, [])).toEqual({
      kind: "swimlane",
      id: "lane",
    });
  });
});
