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
      modelingMode: "arc42",
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
      modelingMode: "arc42",
      elements: [parent],
    });
    const detail = createEmptyBoardView({
      id: "detail",
      name: "Ordering",
      modelingMode: "arc42",
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

  it("supports C4 software-system zoom into a whitebox scope", () => {
    const system = el({ id: "sys", type: "c4SoftwareSystem", label: "Banking" });
    const payload = extractBuildingBlockViewPayload("sys", [system], [])!;
    const view = buildBoardViewFromBuildingBlock(system, payload, {
      id: "v-c4",
      name: "Banking",
      modelingMode: "c4",
      workshopFormat: "c4Modeling",
    });
    expect(view.elements.some((e) => e.type === "archWhitebox" && e.label === "Banking")).toBe(
      true,
    );
  });

  it("resolves C4 container drill-down navigation", () => {
    const container = el({
      id: "api",
      type: "c4Container",
      label: "API Application",
      detailViewId: "comp-view",
    });
    const whitebox = el({ id: "wb", type: "archWhitebox", label: "API Application" });
    const overview = createEmptyBoardView({
      id: "containers",
      name: "Containers",
      modelingMode: "c4",
      elements: [container],
    });
    const detail = createEmptyBoardView({
      id: "comp-view",
      name: "API Application",
      modelingMode: "c4",
      elements: [whitebox],
    });
    expect(resolveBuildingBlockViewNavigation(container, "containers", [overview, detail])).toEqual({
      direction: "down",
      targetViewId: "comp-view",
      targetViewName: "API Application",
    });
  });

  it("supports cloud-boundary zoom into a whitebox scope", () => {
    const boundary = el({ id: "lz", type: "cloudBoundary", label: "Landing Zone Prod" });
    const payload = extractBuildingBlockViewPayload("lz", [boundary], [])!;
    const view = buildBoardViewFromBuildingBlock(boundary, payload, {
      id: "v-cloud",
      name: "Landing Zone Prod",
      modelingMode: "cloud",
      workshopFormat: "cloudArchitecture",
    });
    expect(
      view.elements.some((e) => e.type === "archWhitebox" && e.label === "Landing Zone Prod"),
    ).toBe(true);
  });
});
