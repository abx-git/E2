import { describe, expect, it } from "vitest";

import {
  connectorDimmedBySelectionFilter,
  elementDimmedBySelectionFilter,
  isSelectionFilterActive,
  relationEndpointsDimmedBySelectionFilter,
} from "@/lib/canvas-selection-filter";

describe("canvas selection filter", () => {
  it("is active only when enabled and ids exist", () => {
    expect(isSelectionFilterActive(false, ["a"])).toBe(false);
    expect(isSelectionFilterActive(true, [])).toBe(false);
    expect(isSelectionFilterActive(true, ["a"])).toBe(true);
  });

  it("dims non-selected elements", () => {
    expect(elementDimmedBySelectionFilter("a", true, ["b"])).toBe(true);
    expect(elementDimmedBySelectionFilter("b", true, ["b", "c"])).toBe(false);
    expect(elementDimmedBySelectionFilter("a", false, ["b"])).toBe(false);
  });

  it("dims relations unless an endpoint is selected", () => {
    expect(relationEndpointsDimmedBySelectionFilter("a", "b", true, ["a"])).toBe(false);
    expect(relationEndpointsDimmedBySelectionFilter("a", "b", true, ["c"])).toBe(true);
  });

  it("dims connectors unless a selected element is involved", () => {
    const involved = (id: string) => id === "x";
    expect(connectorDimmedBySelectionFilter(involved, true, ["x"])).toBe(false);
    expect(connectorDimmedBySelectionFilter(involved, true, ["y"])).toBe(true);
  });
});
