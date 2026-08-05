import { describe, expect, it } from "vitest";

import { expandCanvasMoveSet, selectionItemCount } from "@/lib/selection-move";
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

const lane = (partial: Partial<Swimlane> & Pick<Swimlane, "id">): Swimlane => ({
  label: "Lane",
  x: 0,
  y: 0,
  width: 400,
  height: 200,
  ...partial,
});

const bc = (partial: Partial<BoundedContext> & Pick<BoundedContext, "id">): BoundedContext => ({
  label: "BC",
  x: 0,
  y: 0,
  width: 300,
  height: 200,
  ...partial,
});

describe("selection-move", () => {
  it("counts mixed selection items", () => {
    expect(
      selectionItemCount({
        elementIds: ["a", "b"],
        swimlaneIds: ["l1"],
        boundedContextIds: [],
      }),
    ).toBe(3);
  });

  it("pulls swimlane members into the move set", () => {
    const lanes = [lane({ id: "l1", x: 0, y: 0, width: 400, height: 200 })];
    const elements = [
      el({ id: "inside", x: 20, y: 20, swimlaneId: "l1" }),
      el({ id: "outside", x: 500, y: 20 }),
    ];
    const result = expandCanvasMoveSet(elements, lanes, [], {
      elementIds: [],
      swimlaneIds: ["l1"],
      boundedContextIds: [],
    });
    expect(result.swimlaneIds).toEqual(["l1"]);
    expect(result.elementIds).toContain("inside");
    expect(result.elementIds).not.toContain("outside");
  });

  it("pulls bounded-context members into the move set", () => {
    const contexts = [bc({ id: "bc1", x: 0, y: 0, width: 300, height: 200 })];
    const elements = [
      el({ id: "inside", x: 20, y: 20, boundedContextId: "bc1" }),
      el({ id: "outside", x: 500, y: 20 }),
    ];
    const result = expandCanvasMoveSet(elements, [], contexts, {
      elementIds: ["outside"],
      swimlaneIds: [],
      boundedContextIds: ["bc1"],
    });
    expect(result.boundedContextIds).toEqual(["bc1"]);
    expect(result.elementIds).toEqual(expect.arrayContaining(["inside", "outside"]));
  });

  it("pulls aggregate and subdomain members into the move set", () => {
    const elements = [
      el({ id: "agg", type: "aggregate", x: 0, y: 0, width: 200, height: 150 }),
      el({ id: "entity", type: "entity", x: 20, y: 20, width: 80, height: 40, aggregateId: "agg" }),
      el({
        id: "sub",
        type: "subdomain",
        x: 300,
        y: 0,
        width: 250,
        height: 200,
      }),
      el({
        id: "cmd",
        type: "command",
        x: 320,
        y: 30,
        width: 80,
        height: 40,
        subdomainId: "sub",
      }),
      el({ id: "other", x: 600, y: 0 }),
    ];
    const result = expandCanvasMoveSet(elements, [], [], {
      elementIds: ["agg", "sub", "other"],
      swimlaneIds: [],
      boundedContextIds: [],
    });
    expect(result.elementIds).toEqual(
      expect.arrayContaining(["agg", "entity", "sub", "cmd", "other"]),
    );
    expect(result.elementIds).toHaveLength(5);
  });

  it("keeps mixed marquee selection regions when expanding", () => {
    const lanes = [lane({ id: "l1" })];
    const contexts = [bc({ id: "bc1", x: 500, y: 0 })];
    const elements = [
      el({ id: "a", x: 20, y: 20, swimlaneId: "l1" }),
      el({ id: "b", x: 520, y: 20, boundedContextId: "bc1" }),
      el({ id: "c", x: 900, y: 20 }),
    ];
    const result = expandCanvasMoveSet(elements, lanes, contexts, {
      elementIds: ["c"],
      swimlaneIds: ["l1"],
      boundedContextIds: ["bc1"],
    });
    expect(result.swimlaneIds).toEqual(["l1"]);
    expect(result.boundedContextIds).toEqual(["bc1"]);
    expect(result.elementIds).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });
});
