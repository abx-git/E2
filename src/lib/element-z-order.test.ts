import { describe, expect, it } from "vitest";

import {
  bringElementsForward,
  bringElementsToFront,
  bringToFront,
  enforceContainerBehindContents,
  regionZOrderItems,
  sendElementsBackward,
  sendElementsToBack,
  sortByZOrder,
  sortElementsByZOrder,
} from "@/lib/element-z-order";
import type { StormElement } from "@/types/storm-element";

function el(
  id: string,
  opts: Partial<StormElement> & { zIndex?: number; type?: StormElement["type"] } = {},
): StormElement {
  return {
    id,
    type: opts.type ?? "note",
    label: id,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width ?? 100,
    height: opts.height ?? 50,
    zIndex: opts.zIndex,
    aggregateId: opts.aggregateId,
    subdomainId: opts.subdomainId,
  };
}

describe("element z-order", () => {
  it("sorts by zIndex then id", () => {
    const sorted = sortElementsByZOrder([
      el("b", { zIndex: 1 }),
      el("a", { zIndex: 1 }),
      el("c", { zIndex: 0 }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["c", "a", "b"]);
  });

  it("brings selection to front", () => {
    const elements = [el("a", { zIndex: 0 }), el("b", { zIndex: 1 }), el("c", { zIndex: 2 })];
    expect(bringElementsToFront(elements, ["a"])).toEqual([{ id: "a", zIndex: 3 }]);
  });

  it("sends selection to back", () => {
    const elements = [el("a", { zIndex: 0 }), el("b", { zIndex: 1 }), el("c", { zIndex: 2 })];
    expect(sendElementsToBack(elements, ["c"])).toEqual([{ id: "c", zIndex: -1 }]);
  });

  it("moves forward / backward one step", () => {
    const elements = [el("a", { zIndex: 0 }), el("b", { zIndex: 1 }), el("c", { zIndex: 2 })];
    expect(bringElementsForward(elements, ["a"])).toEqual([
      { id: "a", zIndex: 1 },
      { id: "b", zIndex: 0 },
    ]);
    expect(sendElementsBackward(elements, ["c"])).toEqual([
      { id: "c", zIndex: 1 },
      { id: "b", zIndex: 2 },
    ]);
  });

  it("keeps aggregate members above the Aggregate Root", () => {
    const elements = [
      el("agg", { type: "aggregate", zIndex: 5, x: 0, y: 0, width: 300, height: 200 }),
      el("ent", {
        type: "entity",
        zIndex: 2,
        x: 20,
        y: 20,
        width: 80,
        height: 40,
        aggregateId: "agg",
      }),
      el("vo", {
        type: "valueObject",
        zIndex: 1,
        x: 120,
        y: 30,
        width: 80,
        height: 40,
        aggregateId: "agg",
      }),
    ];
    const next = enforceContainerBehindContents(elements);
    const aggZ = next.find((e) => e.id === "agg")!.zIndex ?? 0;
    expect(next.find((e) => e.id === "ent")!.zIndex).toBeGreaterThan(aggZ);
    expect(next.find((e) => e.id === "vo")!.zIndex).toBeGreaterThan(aggZ);
  });

  it("keeps nested contents above subdomain and aggregate", () => {
    const elements = [
      el("sub", { type: "subdomain", zIndex: 10, x: 0, y: 0, width: 400, height: 300 }),
      el("agg", {
        type: "aggregate",
        zIndex: 3,
        x: 40,
        y: 40,
        width: 200,
        height: 150,
        subdomainId: "sub",
      }),
      el("ent", {
        type: "entity",
        zIndex: 1,
        x: 60,
        y: 60,
        width: 80,
        height: 40,
        aggregateId: "agg",
        subdomainId: "sub",
      }),
    ];
    const next = enforceContainerBehindContents(elements);
    const subZ = next.find((e) => e.id === "sub")!.zIndex ?? 0;
    const aggZ = next.find((e) => e.id === "agg")!.zIndex ?? 0;
    const entZ = next.find((e) => e.id === "ent")!.zIndex ?? 0;
    expect(aggZ).toBeGreaterThan(subZ);
    expect(entZ).toBeGreaterThan(aggZ);
  });
});

describe("region z-order", () => {
  it("shares order across swimlanes and bounded contexts", () => {
    const swimlanes = [
      { id: "lane-a", zIndex: 0 },
      { id: "lane-b", zIndex: 2 },
    ];
    const bcs = [{ id: "bc-a", zIndex: 1 }];
    const ordered = sortByZOrder(regionZOrderItems(swimlanes, bcs));
    expect(ordered.map((r) => r.id)).toEqual(["lane-a", "bc-a", "lane-b"]);
    expect(bringToFront(ordered, ["lane-a"])).toEqual([{ id: "lane-a", zIndex: 3 }]);
  });
});
