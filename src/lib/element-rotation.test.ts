import { describe, expect, it } from "vitest";

import {
  effectiveElementRotation,
  normalizeRotationDegrees,
  snapRotationDegrees,
} from "@/lib/element-rotation";

describe("element-rotation", () => {
  it("normalizes into (-180, 180]", () => {
    expect(normalizeRotationDegrees(0)).toBe(0);
    expect(normalizeRotationDegrees(45)).toBe(45);
    expect(normalizeRotationDegrees(180)).toBe(180);
    expect(normalizeRotationDegrees(181)).toBe(-179);
    expect(normalizeRotationDegrees(360)).toBe(0);
    expect(normalizeRotationDegrees(-45)).toBe(-45);
    expect(normalizeRotationDegrees(-180)).toBe(180);
    expect(normalizeRotationDegrees(-181)).toBe(179);
  });

  it("snaps to steps", () => {
    expect(snapRotationDegrees(7, 15)).toBe(0);
    expect(snapRotationDegrees(8, 15)).toBe(15);
    expect(snapRotationDegrees(44, 15)).toBe(45);
  });

  it("uses element rotation over style default", () => {
    expect(effectiveElementRotation(undefined, 45)).toBe(45);
    expect(effectiveElementRotation(0, 45)).toBe(0);
    expect(effectiveElementRotation(90, 45)).toBe(90);
  });
});
