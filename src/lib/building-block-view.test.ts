import { describe, expect, it } from "vitest";

import {
  buildBoardViewFromBuildingBlock,
  extractBuildingBlockViewPayload,
  resolveBuildingBlockViewNavigation,
} from "@/lib/building-block-view";
import { createEmptyBoardView } from "@/lib/storm-json";
import type { StormElement } from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";

function el(partial: Partial<StormElement> & Pick<StormElement, "id" | "type" | "label">): StormElement {
  return {
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    ...partial,
  };
}

describe("building-block-view", () => {
  it("extracts contains-children of a blackbox", () => {
    const elements = [
      el({ id: "bb", type: "archBlackbox", label: "Checkout", x: 0, y: 0 }),
      el({ id: "c1", type: "archComponent", label: "Cart", x: 40, y: 40 }),
      el({ id: "c2", type: "archComponent", label: "Pay", x: 200, y: 40 }),
      el({ id: "other", type: "note", label: "x", x: 400, y: 40 }),
    ];
    const relations: StormRelation[] = [
      { id: "r1", type: "contains", sourceId: "bb", targetId: "c1" },
      { id: "r2", type: "contains", sourceId: "bb", targetId: "c2" },
    ];
    const payload = extractBuildingBlockViewPayload("bb", elements, relations);
    expect(payload?.elements.map((e) => e.id).sort()).toEqual(["c1", "c2"]);
  });

  it("seeds a whitebox detail view even when empty", () => {
    const parent = el({ id: "bb", type: "archBlackbox", label: "Ordering" });
    const payload = extractBuildingBlockViewPayload("bb", [parent], [])!;
    const view = buildBoardViewFromBuildingBlock(parent, payload, {
      id: "v1",
      name: "Ordering",
      modelingMode: "architectureDocumentation",
      workshopFormat: "arc42Workshop",
    });
    expect(view.elements.some((e) => e.type === "archWhitebox" && e.label === "Ordering")).toBe(
      true,
    );
  });

  it("resolves drill-down and drill-up by label", () => {
    const parent = el({
      id: "bb",
      type: "archBlackbox",
      label: "Ordering",
      detailViewId: "detail",
    });
    const whitebox = el({ id: "wb", type: "archWhitebox", label: "Ordering" });
    const overview = createEmptyBoardView({
      id: "overview",
      name: "Overview",
      modelingMode: "architectureDocumentation",
      elements: [parent],
    });
    const detail = createEmptyBoardView({
      id: "detail",
      name: "Ordering",
      modelingMode: "architectureDocumentation",
      elements: [whitebox],
    });

    expect(resolveBuildingBlockViewNavigation(parent, "overview", [overview, detail])).toEqual({
      direction: "down",
      targetViewId: "detail",
      targetViewName: "Ordering",
    });
    expect(resolveBuildingBlockViewNavigation(whitebox, "detail", [overview, detail])).toEqual({
      direction: "up",
      targetViewId: "overview",
      targetViewName: "Overview",
      parentElementId: "bb",
    });
  });
});
