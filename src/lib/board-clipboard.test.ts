import { describe, expect, it } from "vitest";

import {
  extractClipboardPayload,
  remapClipboardForPaste,
  selectionCentroid,
} from "@/lib/board-clipboard";
import type { StormElement } from "@/types/storm-element";
import type { StormRelation } from "@/types/storm-relation";

const elements: StormElement[] = [
  { id: "a", type: "domainEvent", label: "A", x: 0, y: 0, width: 100, height: 50 },
  { id: "b", type: "command", label: "B", x: 200, y: 0, width: 100, height: 50 },
  { id: "c", type: "actor", label: "C", x: 400, y: 0, width: 80, height: 40 },
];

const relations: StormRelation[] = [
  { id: "r1", type: "triggers", sourceId: "b", targetId: "a" },
  { id: "r2", type: "executedBy", sourceId: "b", targetId: "c" },
];

describe("board-clipboard", () => {
  it("extracts selection and only internal relations", () => {
    const payload = extractClipboardPayload(elements, relations, ["a", "b"]);
    expect(payload).not.toBeNull();
    expect(payload!.elements.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(payload!.relations).toHaveLength(1);
    expect(payload!.relations[0]!.id).toBe("r1");
    expect(payload!.elements.every((e) => e.swimlaneId === undefined)).toBe(true);
  });

  it("remaps ids and offsets to paste target", () => {
    const payload = extractClipboardPayload(elements, relations, ["a", "b"])!;
    const remapped = remapClipboardForPaste(payload, 1000, 500);
    expect(remapped.elements).toHaveLength(2);
    expect(remapped.newIds).toHaveLength(2);
    expect(remapped.newIds.every((id) => !["a", "b"].includes(id))).toBe(true);
    expect(remapped.relations).toHaveLength(1);
    expect(remapped.relations[0]!.sourceId).toBe(remapped.elements.find((e) => e.label === "B")!.id);
    expect(remapped.relations[0]!.targetId).toBe(remapped.elements.find((e) => e.label === "A")!.id);

    const c = selectionCentroid(remapped.elements);
    expect(c.x).toBeCloseTo(1000, 5);
    expect(c.y).toBeCloseTo(500, 5);
  });
});
