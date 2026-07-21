import { describe, expect, it } from "vitest";

import {
  applyContainmentAssignments,
  elementIdsInSwimlane,
  rectFullyContains,
  resolveBoundedContextId,
  resolveSwimlaneId,
  translateMatchingElements,
} from "@/lib/region-containment";
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

describe("region-containment", () => {
  it("detects full containment", () => {
    expect(rectFullyContains({ x: 0, y: 0, w: 100, h: 100 }, { x: 10, y: 10, w: 20, h: 20 })).toBe(
      true,
    );
    expect(rectFullyContains({ x: 0, y: 0, w: 100, h: 100 }, { x: 0, y: 0, w: 100, h: 100 })).toBe(
      true,
    );
    expect(rectFullyContains({ x: 0, y: 0, w: 100, h: 100 }, { x: 90, y: 10, w: 20, h: 20 })).toBe(
      false,
    );
  });

  it("assigns swimlane when fully inside and clears when outside", () => {
    const lanes = [lane({ id: "l1", x: 0, y: 0, width: 400, height: 200 })];
    expect(resolveSwimlaneId(el({ id: "a", x: 20, y: 20 }), lanes)).toBe("l1");
    expect(resolveSwimlaneId(el({ id: "a", x: 350, y: 20 }), lanes)).toBeUndefined();
  });

  it("prefers the smallest enclosing bounded context", () => {
    const contexts = [
      bc({ id: "outer", x: 0, y: 0, width: 500, height: 400 }),
      bc({ id: "inner", x: 50, y: 50, width: 200, height: 150 }),
    ];
    expect(resolveBoundedContextId(el({ id: "a", x: 60, y: 60 }), contexts)).toBe("inner");
    expect(resolveBoundedContextId(el({ id: "a", x: 10, y: 10 }), contexts)).toBe("outer");
  });

  it("updates only changed assignment fields", () => {
    const elements = [
      el({ id: "in", x: 20, y: 20, swimlaneId: undefined }),
      el({ id: "out", x: 500, y: 20, swimlaneId: "l1" }),
    ];
    const lanes = [lane({ id: "l1" })];
    const next = applyContainmentAssignments(elements, lanes, []);
    expect(next[0]?.swimlaneId).toBe("l1");
    expect(next[1]?.swimlaneId).toBeUndefined();
    expect(next).not.toBe(elements);
  });

  it("returns same reference when nothing changes", () => {
    const elements = [el({ id: "a", x: 20, y: 20, swimlaneId: "l1" })];
    const lanes = [lane({ id: "l1" })];
    expect(applyContainmentAssignments(elements, lanes, [])).toBe(elements);
  });

  it("translates matching elements", () => {
    const elements = [
      el({ id: "a", x: 10, y: 10, swimlaneId: "l1" }),
      el({ id: "b", x: 10, y: 10, swimlaneId: undefined }),
    ];
    const next = translateMatchingElements(elements, (e) => e.swimlaneId === "l1", 5, -3);
    expect(next[0]).toMatchObject({ id: "a", x: 15, y: 7 });
    expect(next[1]).toBe(elements[1]);
  });

  it("snapshots swimlane members by id or containment", () => {
    const lanes = lane({ id: "l1", x: 0, y: 0, width: 200, height: 100 });
    const elements = [
      el({ id: "inside", x: 10, y: 10 }),
      el({ id: "assigned", x: 500, y: 500, swimlaneId: "l1" }),
      el({ id: "outside", x: 300, y: 10 }),
    ];
    expect(elementIdsInSwimlane(elements, lanes).sort()).toEqual(["assigned", "inside"]);
  });
});
