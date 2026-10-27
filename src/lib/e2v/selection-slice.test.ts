import { describe, expect, it } from "vitest";

import { collectE2vEntityIds, sliceCanvasViewForSelection } from "@/lib/e2v/selection-slice";
import { createEmptyBoardView } from "@/lib/storm-json";
import type { BoardConnector } from "@/types/board-connector";

describe("sliceCanvasViewForSelection", () => {
  const base = createEmptyBoardView({ id: "view-1", name: "Flow" });
  const view = {
    ...base,
    elements: [
      { id: "e1", type: "domainEvent", label: "A", x: 10, y: 20, width: 160, height: 72 },
      { id: "e2", type: "command", label: "B", x: 200, y: 20, width: 160, height: 72 },
      { id: "e3", type: "actor", label: "C", x: 400, y: 20, width: 80, height: 40 },
    ],
    relations: [
      { id: "r1", type: "triggers", sourceId: "e2", targetId: "e1" },
      { id: "r2", type: "executedBy", sourceId: "e2", targetId: "e3" },
    ],
    connectors: [
      {
        id: "cn1",
        source: { attach: "element", id: "e1" },
        target: { attach: "element", id: "e2" },
      } satisfies BoardConnector,
      {
        id: "cn2",
        source: { attach: "element", id: "e2" },
        target: { attach: "element", id: "e3" },
      } satisfies BoardConnector,
    ],
  };

  it("returns null for empty selection", () => {
    expect(sliceCanvasViewForSelection(view, { selection: { elementIds: [] } })).toBeNull();
  });

  it("keeps internal relations and connectors between selected elements", () => {
    const slice = sliceCanvasViewForSelection(view, {
      selection: { elementIds: ["e1", "e2"] },
    });
    expect(slice).not.toBeNull();
    expect(slice!.id).toBe("view-1");
    expect(slice!.elements.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
    expect(slice!.relations.map((r) => r.id)).toEqual(["r1"]);
    expect(slice!.connectors.map((c) => c.id)).toEqual(["cn1"]);
    expect(slice!.canvasLines).toEqual([]);
  });

  it("includes explicitly selected connector with point endpoints", () => {
    const withPoint: typeof view = {
      ...view,
      connectors: [
        {
          id: "cn-point",
          source: { attach: "point", x: 0, y: 0 },
          target: { attach: "element", id: "e1" },
        },
      ],
    };
    const slice = sliceCanvasViewForSelection(withPoint, {
      selection: { elementIds: ["e1"] },
      selectedConnectorId: "cn-point",
    });
    expect(slice!.connectors.map((c) => c.id)).toEqual(["cn-point"]);
  });

  it("collectE2vEntityIds gathers all slice entity ids", () => {
    const slice = sliceCanvasViewForSelection(view, {
      selection: { elementIds: ["e1", "e2"] },
    })!;
    const ids = collectE2vEntityIds(slice);
    expect(ids.sort()).toEqual(["cn1", "e1", "e2", "r1"].sort());
  });
});
