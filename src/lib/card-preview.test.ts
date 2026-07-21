import { describe, expect, it } from "vitest";

import { cardAttributeLines, cardMethodLines, cardShowsDetails } from "@/lib/card-preview";
import type { StormElement } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "type">): StormElement {
  return {
    id: "1",
    label: "Test",
    x: 0,
    y: 0,
    ...partial,
  };
}

describe("card-preview", () => {
  it("collects attributes and methods", () => {
    const entity = el({
      type: "entity",
      metadata: {
        identityFields: ["id"],
        attributes: ["name: string"],
        operations: ["rename()"],
        showAttributesOnCard: true,
        showMethodsOnCard: true,
      },
    });
    expect(cardAttributeLines(entity)).toEqual(["id: id", "name: string"]);
    expect(cardMethodLines(entity)).toEqual(["rename()"]);
    expect(cardShowsDetails(entity)).toBe(true);
  });

  it("formats example GWT as attribute lines", () => {
    const example = el({
      type: "example",
      metadata: {
        exampleGiven: ["cart empty"],
        exampleWhen: ["add item"],
        exampleThen: ["cart has 1"],
      },
    });
    expect(cardAttributeLines(example)).toEqual([
      "G: cart empty",
      "W: add item",
      "T: cart has 1",
    ]);
  });
});
