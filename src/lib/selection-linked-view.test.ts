import { describe, expect, it } from "vitest";

import {
  boundsForSelectionSlice,
  buildLinkedDetailViewFromSlice,
  createSelectionLinkElement,
  stripSelectionFromCanvasView,
} from "@/lib/selection-linked-view";
import { sliceCanvasViewForSelection } from "@/lib/e2v/selection-slice";
import { createEmptyBoardView } from "@/lib/storm-json";
import type { BoardConnector } from "@/types/board-connector";

describe("selection-linked-view", () => {
  const view = createEmptyBoardView({
    id: "v1",
    name: "Overview",
    elements: [
      { id: "e1", type: "domainEvent", label: "A", x: 100, y: 100, width: 160, height: 72 },
      { id: "e2", type: "command", label: "B", x: 300, y: 100, width: 160, height: 72 },
      { id: "e3", type: "actor", label: "Outside", x: 900, y: 100, width: 80, height: 40 },
    ],
    relations: [{ id: "r1", type: "triggers", sourceId: "e2", targetId: "e1" }],
    connectors: [
      {
        id: "cn1",
        source: { attach: "element", id: "e1" },
        target: { attach: "element", id: "e2" },
      } satisfies BoardConnector,
      {
        id: "cn-out",
        source: { attach: "element", id: "e2" },
        target: { attach: "element", id: "e3" },
      } satisfies BoardConnector,
    ],
  });

  it("builds a detail view and strips selection from origin", () => {
    const slice = sliceCanvasViewForSelection(view, {
      selection: { elementIds: ["e1", "e2"] },
    })!;
    const newId = "detail-1";
    const detail = buildLinkedDetailViewFromSlice(slice, {
      id: newId,
      name: "Detail",
      modelingMode: view.modelingMode,
      workshopFormat: view.workshopFormat,
    });
    expect(detail.elements).toHaveLength(2);
    expect(detail.connectors).toHaveLength(1);
    expect(detail.relations).toHaveLength(1);

    const stripped = stripSelectionFromCanvasView(view, slice);
    expect(stripped.elements.map((e) => e.id)).toEqual(["e3"]);
    expect(stripped.connectors).toHaveLength(0);

    const bounds = boundsForSelectionSlice(slice);
    const link = createSelectionLinkElement(bounds, "Detail", newId);
    expect(link.detailViewId).toBe(newId);
    expect(link.type).toBe("note");
    expect(link.x).toBe(bounds.x);
  });
});
