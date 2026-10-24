import { describe, expect, it } from "vitest";

import {
  extractElementAttributeClipboard,
  planElementAttributePaste,
} from "@/lib/element-attribute-clipboard";
import type { StormElement } from "@/types/storm-element";

function el(partial: Partial<StormElement> & Pick<StormElement, "id" | "type">): StormElement {
  return {
    label: "",
    x: 0,
    y: 0,
    ...partial,
  };
}

describe("element-attribute-clipboard", () => {
  it("extracts label, description, and metadata without layout ids", () => {
    const clip = extractElementAttributeClipboard(
      el({
        id: "a",
        type: "command",
        label: "Place Order",
        description: "Does stuff",
        x: 10,
        y: 20,
        swimlaneId: "lane-1",
        metadata: { progressMark: "ok" },
      }),
    );
    expect(clip.sourceType).toBe("command");
    expect(clip.label).toBe("Place Order");
    expect(clip.description).toBe("Does stuff");
    expect(clip.metadata.progressMark).toBe("ok");
  });

  it("changes type and warns when target metadata would be lost", () => {
    const clip = extractElementAttributeClipboard(
      el({
        id: "src",
        type: "command",
        label: "Cmd",
        metadata: {},
      }),
    );
    const plan = planElementAttributePaste(
      el({
        id: "tgt",
        type: "domainEvent",
        label: "Old",
        metadata: { isRecurring: true },
      }),
      clip,
    );
    expect(plan.patch.type).toBe("command");
    expect(plan.warnings.some((w) => w.kind === "typeChange")).toBe(true);
    expect(plan.warnings.some((w) => w.kind === "targetMetadataLost" && w.key === "isRecurring")).toBe(
      true,
    );
  });

  it("keeps aggregate attributes when pasting aggregate onto entity", () => {
    const clip = extractElementAttributeClipboard(
      el({
        id: "src",
        type: "aggregate",
        label: "Order",
        metadata: { attributes: ["total: Money"] },
      }),
    );
    const plan = planElementAttributePaste(
      el({
        id: "tgt",
        type: "entity",
        label: "X",
        metadata: { identityFields: ["id"] },
      }),
      clip,
    );
    expect(plan.patch.type).toBe("aggregate");
    expect(plan.patch.metadata?.attributes).toEqual(["total: Money"]);
    expect(plan.warnings.some((w) => w.kind === "targetMetadataLost" && w.key === "identityFields")).toBe(
      true,
    );
  });
});
