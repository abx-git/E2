import { describe, expect, it } from "vitest";

import { createEmptyBoardView } from "@/lib/storm-json";
import {
  elementHasLinkedView,
  pushViewReturnStack,
  resolveElementLinkedView,
} from "@/lib/view-navigation";
import type { StormElement } from "@/types/storm-element";

const views = [
  createEmptyBoardView({ id: "v1", name: "Overview" }),
  createEmptyBoardView({ id: "v2", name: "Detail" }),
];

const el: StormElement = {
  id: "e1",
  type: "domainEvent",
  label: "Order placed",
  x: 0,
  y: 0,
  detailViewId: "v2",
};

describe("view-navigation", () => {
  it("pushes return hops and skips no-ops", () => {
    expect(pushViewReturnStack([], "v1", "v2")).toEqual(["v1"]);
    expect(pushViewReturnStack(["v1"], "v1", "v2")).toEqual(["v1"]);
    expect(pushViewReturnStack(["v0"], "v1", "v1")).toEqual(["v0"]);
  });

  it("resolves element linked views", () => {
    expect(resolveElementLinkedView(el, views)?.name).toBe("Detail");
    expect(elementHasLinkedView(el, views)).toBe(true);
    expect(elementHasLinkedView({ ...el, detailViewId: "missing" }, views)).toBe(false);
  });
});
