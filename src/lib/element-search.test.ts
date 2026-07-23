import { describe, expect, it } from "vitest";

import { matchElementSearch, splitHighlight } from "@/lib/element-search";
import type { StormElement } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "type">): StormElement {
  return {
    id: "e1",
    label: "Order Placed",
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    ...partial,
  };
}

describe("matchElementSearch", () => {
  it("matches label case-insensitively", () => {
    const hit = matchElementSearch(el({ type: "domainEvent", label: "Order Placed" }), "order");
    expect(hit).toMatchObject({
      match: true,
      inLabel: true,
      emphasizeCard: false,
    });
  });

  it("emphasizes card when hit is only in description", () => {
    const hit = matchElementSearch(
      el({
        type: "domainEvent",
        label: "Foo",
        description: "Customer checked out",
      }),
      "customer",
    );
    expect(hit).toMatchObject({
      match: true,
      inLabel: false,
      inDescription: true,
      emphasizeCard: true,
    });
  });

  it("matches attributes and methods", () => {
    const hit = matchElementSearch(
      el({
        type: "aggregate",
        label: "Cart",
        metadata: {
          attributes: ["currency: EUR"],
          aggregateMethods: ["addItem()"],
        },
      }),
      "additem",
    );
    expect(hit.inMethods).toBe(true);
    expect(hit.emphasizeCard).toBe(true);

    const attr = matchElementSearch(
      el({
        type: "aggregate",
        label: "Cart",
        metadata: { attributes: ["currency: EUR"] },
      }),
      "eur",
    );
    expect(attr.inAttributes).toBe(true);
    expect(attr.emphasizeCard).toBe(true);
  });

  it("returns no match for empty query", () => {
    expect(matchElementSearch(el({ type: "note", label: "Hi" }), "  ").match).toBe(false);
  });
});

describe("splitHighlight", () => {
  it("splits all case-insensitive occurrences", () => {
    expect(splitHighlight("Order order ORDER", "or")).toEqual([
      { text: "Or", hit: true },
      { text: "der ", hit: false },
      { text: "or", hit: true },
      { text: "der ", hit: false },
      { text: "OR", hit: true },
      { text: "DER", hit: false },
    ]);
  });
});
