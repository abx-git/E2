import { describe, expect, it } from "vitest";

import {
  cardWebLinkHref,
  cardWebLinkLabel,
  cardWebLinkLines,
  normalizeCardWebLinks,
} from "@/lib/card-web-links";
import type { StormElement } from "@/types/storm-element";

describe("normalizeCardWebLinks", () => {
  it("keeps objects, accepts string URLs, and drops empties", () => {
    expect(
      normalizeCardWebLinks([
        { url: "https://docs.example/", title: "Docs" },
        { url: "  " },
        "example.com/api",
        { url: "https://docs.example/", title: "Docs" },
        null,
      ]),
    ).toEqual([
      { url: "https://docs.example/", title: "Docs" },
      { url: "example.com/api" },
    ]);
  });
});

describe("card web link display", () => {
  it("prefers title and falls back to host/path", () => {
    expect(cardWebLinkLabel({ url: "https://example.com/docs", title: "Spec" })).toBe("Spec");
    expect(cardWebLinkLabel({ url: "https://example.com/docs" })).toBe("example.com/docs");
    expect(cardWebLinkHref({ url: "example.com" })).toBe("https://example.com/");
  });

  it("lists labels from element metadata", () => {
    const el: StormElement = {
      id: "1",
      type: "domainEvent",
      label: "Placed",
      x: 0,
      y: 0,
      metadata: {
        webLinks: [{ url: "https://wiki.test/order", title: "Wiki" }],
      },
    };
    expect(cardWebLinkLines(el)).toEqual(["Wiki"]);
  });
});
