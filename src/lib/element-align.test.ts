import { describe, expect, it } from "vitest";

import { computeAlignPatches } from "@/lib/element-align";
import type { StormElement } from "@/types/storm-element";

function el(
  id: string,
  x: number,
  y: number,
  width = 100,
  height = 50,
): StormElement {
  return { id, type: "domainEvent", label: id, x, y, width, height };
}

describe("computeAlignPatches", () => {
  const trio = [el("a", 0, 10, 40, 20), el("b", 80, 40, 60, 30), el("c", 200, 0, 50, 40)];

  it("aligns left", () => {
    const patches = computeAlignPatches(trio, "left");
    expect(patches.every((p) => p.x === 0)).toBe(true);
  });

  it("aligns right", () => {
    const patches = computeAlignPatches(trio, "right");
    const byId = Object.fromEntries(patches.map((p) => [p.id, p]));
    expect(byId.a.x).toBe(210);
    expect(byId.b.x).toBe(190);
    expect(byId.c.x).toBe(200);
  });

  it("distributes horizontally with equal gaps", () => {
    const patches = computeAlignPatches(trio, "distributeX");
    const byId = Object.fromEntries(patches.map((p) => [p.id, p.x!]));
    // span 250, widths 150, 2 gaps → gap 50 → x: 0, 90, 200
    expect(byId.a).toBe(0);
    expect(byId.b).toBe(90);
    expect(byId.c).toBe(200);
  });

  it("matches width to reference", () => {
    const patches = computeAlignPatches(trio, "sameWidth", "b");
    expect(patches.every((p) => p.width === 60)).toBe(true);
  });

  it("returns empty for fewer than 2 elements", () => {
    expect(computeAlignPatches([el("a", 0, 0)], "left")).toEqual([]);
  });
});
