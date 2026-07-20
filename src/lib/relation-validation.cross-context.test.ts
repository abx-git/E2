import { describe, expect, it } from "vitest";

import { defaultRelationType, validateBoard } from "@/lib/relation-validation";
import type { StormElement } from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";

describe("defaultRelationType", () => {
  it("uses annotates when a note is involved", () => {
    const note: StormElement = {
      id: "n1",
      type: "note",
      label: "Check later",
      x: 0,
      y: 0,
    };
    const event: StormElement = {
      id: "e1",
      type: "domainEvent",
      label: "Order Placed",
      x: 100,
      y: 0,
    };
    expect(defaultRelationType(note, event)).toBe("annotates");
    expect(defaultRelationType(event, note)).toBe("annotates");
  });
});

describe("cross-context validation", () => {
  it("warns when element relation crosses BCs without context map link", () => {
    const elements: StormElement[] = [
      {
        id: "a",
        type: "domainEvent",
        label: "A",
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        boundedContextId: "bc1",
      },
      {
        id: "b",
        type: "command",
        label: "B",
        x: 200,
        y: 0,
        width: 100,
        height: 50,
        boundedContextId: "bc2",
      },
    ];
    const relations: StormRelation[] = [
      { id: "r1", type: "triggers", sourceId: "a", targetId: "b" },
    ];

    const issues = validateBoard(elements, relations, []);
    expect(issues.some((i) => i.id.startsWith("cross-ctx") && i.severity === "warning")).toBe(
      true,
    );
  });

  it("does not warn when context relation exists", () => {
    const elements: StormElement[] = [
      {
        id: "a",
        type: "domainEvent",
        label: "A",
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        boundedContextId: "bc1",
      },
      {
        id: "b",
        type: "command",
        label: "B",
        x: 200,
        y: 0,
        width: 100,
        height: 50,
        boundedContextId: "bc2",
      },
    ];
    const relations: StormRelation[] = [
      { id: "r1", type: "triggers", sourceId: "a", targetId: "b" },
    ];
    const contextRelations: ContextRelation[] = [
      {
        id: "cr1",
        type: "antiCorruptionLayer",
        sourceContextId: "bc1",
        targetContextId: "bc2",
      },
    ];

    const issues = validateBoard(elements, relations, contextRelations);
    expect(issues.some((i) => i.id.startsWith("cross-ctx"))).toBe(false);
  });
});
