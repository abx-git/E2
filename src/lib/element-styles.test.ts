import { describe, expect, it } from "vitest";

import { effectiveElementRotation } from "@/lib/element-rotation";
import {
  isKnownElementType,
  resolveElementStyle,
  styleForElementType,
} from "@/lib/element-styles";
import type { ElementType } from "@/types/storm-element";

describe("element-styles lookup", () => {
  it("treats only catalog types as known", () => {
    expect(isKnownElementType("domainEvent")).toBe(true);
    expect(isKnownElementType("customCard")).toBe(true);
    expect(isKnownElementType("hotspot")).toBe(true);
    expect(isKnownElementType("notARealType")).toBe(false);
    expect(isKnownElementType(undefined)).toBe(false);
  });

  it("falls back to note style so rotation can be read after JSON import", () => {
    const style = styleForElementType("bogusSticky");
    expect(style).toBe(styleForElementType("note"));
    expect(() => effectiveElementRotation(undefined, style.rotation)).not.toThrow();
    expect(effectiveElementRotation(undefined, style.rotation)).toBe(0);

    const resolved = resolveElementStyle({
      type: "missingType" as ElementType,
    });
    expect(resolved.defaultWidth).toBeGreaterThan(0);
    expect(() => effectiveElementRotation(45, resolved.rotation)).not.toThrow();
  });

  it("keeps hotspot default rotation", () => {
    expect(styleForElementType("hotspot").rotation).toBe(45);
    expect(effectiveElementRotation(undefined, styleForElementType("hotspot").rotation)).toBe(45);
  });
});
