import { describe, expect, it } from "vitest";

import type { StormElement } from "@/types/storm-element";

import {
  connectorDimmedByTypeVisibilityFilter,
  elementDimmedByTypeVisibilityFilter,
  isTypeVisibilityFilterActive,
  relationEndpointsDimmedByTypeVisibilityFilter,
} from "@/lib/canvas-type-visibility-filter";

const note = (id: string): StormElement => ({
  id,
  type: "note",
  label: "n",
  x: 0,
  y: 0,
});

const custom = (id: string, customTypeId: string): StormElement => ({
  id,
  type: "customCard",
  label: "c",
  x: 0,
  y: 0,
  metadata: { customTypeId },
});

describe("canvas type visibility filter", () => {
  it("is active when any hidden lists are non-empty", () => {
    expect(isTypeVisibilityFilterActive([], [])).toBe(false);
    expect(isTypeVisibilityFilterActive(["note"], [])).toBe(true);
    expect(isTypeVisibilityFilterActive([], ["ct-1"])).toBe(true);
  });

  it("dims hidden built-in types", () => {
    expect(elementDimmedByTypeVisibilityFilter(note("a"), ["note"], [])).toBe(true);
    expect(elementDimmedByTypeVisibilityFilter(note("a"), ["event"], [])).toBe(false);
  });

  it("dims custom cards by stereotype id", () => {
    expect(
      elementDimmedByTypeVisibilityFilter(custom("a", "iface"), [], ["iface"]),
    ).toBe(true);
    expect(
      elementDimmedByTypeVisibilityFilter(custom("a", "iface"), ["customCard"], []),
    ).toBe(true);
  });

  it("dims relations unless an endpoint stays visible", () => {
    expect(
      relationEndpointsDimmedByTypeVisibilityFilter(
        note("a"),
        note("b"),
        ["note"],
        [],
      ),
    ).toBe(true);
    expect(
      relationEndpointsDimmedByTypeVisibilityFilter(
        note("a"),
        { ...note("b"), type: "event" },
        ["note"],
        [],
      ),
    ).toBe(false);
  });

  it("dims connectors unless a visible element is involved", () => {
    const elements = [note("a"), { ...note("b"), type: "event" as const }];
    const involved = (id: string) => id === "a" || id === "b";
    expect(
      connectorDimmedByTypeVisibilityFilter(elements, involved, ["note"], []),
    ).toBe(false);
    expect(
      connectorDimmedByTypeVisibilityFilter(elements, involved, ["note", "event"], []),
    ).toBe(true);
  });
});
