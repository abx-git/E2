import { describe, expect, it } from "vitest";
import {
  elementLabelIsCentered,
  elementTypeBadgeLabel,
  isBoundaryElement,
} from "@/lib/board-export-visual";
import type { StormElement } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "type" | "label">): StormElement {
  return {
    id: partial.id ?? "x",
    x: 0,
    y: 0,
    ...partial,
  };
}

describe("board export visual helpers", () => {
  it("centers plain stickies and left-aligns notes, boundaries, and badges", () => {
    expect(elementLabelIsCentered(el({ type: "domainEvent", label: "A" }))).toBe(true);
    expect(elementLabelIsCentered(el({ type: "note", label: "A" }))).toBe(false);
    expect(elementLabelIsCentered(el({ type: "aggregate", label: "A" }))).toBe(false);
    expect(elementLabelIsCentered(el({ type: "instruction", label: "A" }))).toBe(false);
    expect(elementLabelIsCentered(el({ type: "c4Container", label: "A" }))).toBe(false);
  });

  it("emits type badges matching the canvas chrome", () => {
    expect(elementTypeBadgeLabel(el({ type: "domainEvent", label: "A" }))).toBeNull();
    expect(elementTypeBadgeLabel(el({ type: "instruction", label: "A" }))).toBe("Instruction");
    expect(elementTypeBadgeLabel(el({ type: "aggregate", label: "A" }))).toBe("Aggregate Root");
    expect(
      elementTypeBadgeLabel(
        el({ type: "subdomain", label: "A", metadata: { subdomainKind: "supporting" } }),
      ),
    ).toBe("Subdomain · Supporting");
    expect(isBoundaryElement(el({ type: "archWhitebox", label: "A" }))).toBe(true);
  });
});
