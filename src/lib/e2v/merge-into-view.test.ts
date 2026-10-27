import { describe, expect, it } from "vitest";

import { mergeImportedViewIntoCanvas } from "@/lib/e2v/merge-into-view";
import { createEmptyBoardView } from "@/lib/storm-json";

describe("mergeImportedViewIntoCanvas", () => {
  const base = createEmptyBoardView({
    id: "v1",
    name: "Keep Name",
    elements: [
      { id: "e1", type: "domainEvent", label: "Old", x: 10, y: 20, width: 160, height: 72 },
      { id: "e2", type: "command", label: "Stay", x: 100, y: 20, width: 160, height: 72 },
    ],
    relations: [{ id: "r1", type: "triggers", sourceId: "e2", targetId: "e1" }],
  });

  it("updates labels and adds new elements", () => {
    const patch = createEmptyBoardView({
      id: "other",
      name: "Ignore",
      elements: [
        { id: "e1", type: "domainEvent", label: "New", x: 99, y: 99, width: 160, height: 72 },
        { id: "e3", type: "actor", label: "Added", x: 300, y: 0, width: 80, height: 40 },
      ],
    });
    const merged = mergeImportedViewIntoCanvas(base, patch);
    expect(merged.name).toBe("Keep Name");
    expect(merged.id).toBe("v1");
    expect(merged.elements.find((e) => e.id === "e1")!.label).toBe("New");
    expect(merged.elements.find((e) => e.id === "e3")!.label).toBe("Added");
    expect(merged.elements).toHaveLength(3);
  });

  it("removes ids listed in removeIds", () => {
    const patch = createEmptyBoardView({
      id: "v1",
      name: "x",
      elements: [{ id: "e2", type: "command", label: "Stay", x: 100, y: 20, width: 160, height: 72 }],
    });
    const merged = mergeImportedViewIntoCanvas(base, patch, new Set(["e1", "r1"]));
    expect(merged.elements.map((e) => e.id)).toEqual(["e2"]);
    expect(merged.relations).toHaveLength(0);
  });
});
