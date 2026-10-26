import { describe, expect, it } from "vitest";

import { effectiveElementRotation } from "@/lib/element-rotation";
import {
  elementPillCornerRadiusPx,
  HOTSPOT_DEFAULT_ROTATION_DEG,
  isCircularPillShape,
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
    expect(styleForElementType("hotspot").rotation).toBe(HOTSPOT_DEFAULT_ROTATION_DEG);
    expect(effectiveElementRotation(undefined, styleForElementType("hotspot").rotation)).toBe(
      HOTSPOT_DEFAULT_ROTATION_DEG,
    );
  });

  it("softens wide pill corners for actors", () => {
    const actor = styleForElementType("actor");
    expect(elementPillCornerRadiusPx(actor.defaultWidth, actor.defaultHeight)).toBe(14);
    expect(isCircularPillShape(actor.defaultWidth, actor.defaultHeight)).toBe(false);
    expect(elementPillCornerRadiusPx(88, 88)).toBe(44);
    expect(isCircularPillShape(88, 88)).toBe(true);
  });
});
