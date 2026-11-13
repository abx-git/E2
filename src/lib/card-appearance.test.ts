import { describe, expect, it } from "vitest";

import { resolveCardPaint } from "@/lib/card-appearance";
import { styleForElementType } from "@/lib/element-styles";

describe("card-appearance", () => {
  it("uses type defaults when no overrides are set", () => {
    const style = styleForElementType("command");
    const paint = resolveCardPaint({ type: "command", metadata: {} }, style, null);
    expect(paint.fillHex).toBe(style.fill);
    expect(paint.fillOpacity).toBe(1);
    expect(paint.borderHex).toBe(style.stroke);
  });

  it("applies custom fill and border opacity", () => {
    const style = styleForElementType("domainEvent");
    const paint = resolveCardPaint(
      {
        type: "domainEvent",
        metadata: {
          cardFillColor: "#ff0000",
          cardFillOpacity: 0.5,
          cardBorderColor: "#112233",
          cardBorderOpacity: 0.8,
        },
      },
      style,
      null,
    );
    expect(paint.fillHex).toBe("#ff0000");
    expect(paint.fillOpacity).toBeCloseTo(0.5);
    expect(paint.borderHex).toBe("#112233");
    expect(paint.borderOpacity).toBeCloseTo(0.8);
    expect(paint.hasCustomAppearance).toBe(true);
  });
});
