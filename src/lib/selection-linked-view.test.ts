import { describe, expect, it } from "vitest";

import {
  boundsForSelectionSlice,
  buildLinkedDetailViewFromSlice,
  buildOriginViewAfterSelectionExtract,
  createSelectionLinkElement,
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

    const bounds = boundsForSelectionSlice(slice);
    const link = createSelectionLinkElement(bounds, "Detail", newId);
    const origin = buildOriginViewAfterSelectionExtract(view, slice, link);

    expect(origin.elements.map((e) => e.id)).toEqual(["e3", link.id]);
    expect(origin.connectors).toHaveLength(1);
    expect(origin.connectors[0]!.id).toBe("cn-out");
    const cn = origin.connectors[0]!;
    expect(
      cn.source.attach === "element" && cn.source.id === link.id
        ? cn.target
        : cn.target.attach === "element" && cn.target.id === link.id
          ? cn.source
          : null,
    ).toEqual({ attach: "element", id: "e3" });

    expect(origin.relations).toHaveLength(0);

    expect(link.detailViewId).toBe(newId);
    expect(link.type).toBe("note");
    expect(link.x).toBe(bounds.x);
  });

  it("rehomes sticky relations onto the link element", () => {
    const withRel = {
      ...view,
      relations: [
        ...view.relations,
        { id: "r-ext", type: "triggers", sourceId: "e3", targetId: "e1" },
      ],
    };
    const slice = sliceCanvasViewForSelection(withRel, {
      selection: { elementIds: ["e1", "e2"] },
    })!;
    const link = createSelectionLinkElement(
      boundsForSelectionSlice(slice),
      "Detail",
      "detail-1",
    );
    const origin = buildOriginViewAfterSelectionExtract(withRel, slice, link);
    expect(origin.relations).toHaveLength(1);
    expect(origin.relations[0]!.id).toBe("r-ext");
    expect(origin.relations[0]!.sourceId).toBe("e3");
    expect(origin.relations[0]!.targetId).toBe(link.id);
  });
});
