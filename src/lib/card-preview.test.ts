import { describe, expect, it } from "vitest";

import { cardAttributeLines, cardMethodLines, cardShowsDescription, cardShowsDetails, isOnCardFieldEnabled, onCardDisplayFieldsForType } from "@/lib/card-preview";
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

  it("treats visible web links as card details", () => {
    const event = el({
      type: "domainEvent",
      metadata: {
        showWebLinksOnCard: true,
        webLinks: [{ url: "https://example.com", title: "Docs" }],
      },
    });
    expect(cardShowsDetails(event)).toBe(true);
    expect(
      cardShowsDetails(
        el({
          type: "domainEvent",
          metadata: { showWebLinksOnCard: true, webLinks: [] },
        }),
      ),
    ).toBe(false);
  });

  it("shows a description on the card unless explicitly hidden", () => {
    const withText = el({ type: "domainEvent", description: "Wichtig" });
    expect(cardShowsDescription(withText)).toBe(true);
    expect(cardShowsDetails(withText)).toBe(true);
    expect(isOnCardFieldEnabled(withText, "showDescriptionOnCard")).toBe(true);

    expect(cardShowsDescription(el({ type: "domainEvent" }))).toBe(false);
    expect(
      cardShowsDescription(
        el({
          type: "domainEvent",
          description: "Versteckt",
          metadata: { showDescriptionOnCard: false },
        }),
      ),
    ).toBe(false);
    expect(
      isOnCardFieldEnabled(
        el({ type: "domainEvent", metadata: { showDescriptionOnCard: false } }),
        "showDescriptionOnCard",
      ),
    ).toBe(false);
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

  it("offers only enterable on-card field types", () => {
    expect(onCardDisplayFieldsForType("domainEvent").map((f) => f.key)).toEqual([
      "showDescriptionOnCard",
      "showWebLinksOnCard",
    ]);
    expect(onCardDisplayFieldsForType("entity").map((f) => f.key)).toEqual([
      "showDescriptionOnCard",
      "showAttributesOnCard",
      "showMethodsOnCard",
      "showWebLinksOnCard",
    ]);
    expect(onCardDisplayFieldsForType("valueObject").map((f) => f.key)).toEqual([
      "showDescriptionOnCard",
      "showAttributesOnCard",
      "showWebLinksOnCard",
    ]);
    expect(onCardDisplayFieldsForType("note").map((f) => f.key)).toEqual([
      "showDescriptionOnCard",
      "showWebLinksOnCard",
    ]);
  });
});
