import { describe, expect, it } from "vitest";

import {
  collectBoardHotspots,
  findMeasureForHotspot,
  hotspotRefKey,
  partitionHotspotsForMeasuresView,
} from "@/lib/board-hotspots";
import { createEmptyBoardView, normalizeBoardDocument } from "@/lib/storm-json";
import type { MeasureActionItem } from "@/types/actions-view";
import { generateStormId } from "@/lib/storm-id";

describe("collectBoardHotspots", () => {
  it("collects hotspots from all canvas views", () => {
    const v1 = createEmptyBoardView({ id: "v1", name: "ES" });
    v1.elements.push({
      id: "h1",
      type: "hotspot",
      label: "Risk A",
      x: 0,
      y: 0,
    });
    const v2 = createEmptyBoardView({ id: "v2", name: "C4" });
    const doc = normalizeBoardDocument({
      title: "T",
      activeViewId: v1.id,
      views: [v1, v2],
    });
    const hotspots = collectBoardHotspots(doc);
    expect(hotspots).toHaveLength(1);
    expect(hotspots[0]?.viewName).toBe("ES");
    expect(hotspots[0]?.label).toBe("Risk A");
  });
});

describe("partitionHotspotsForMeasuresView", () => {
  it("splits excluded keys without deleting hotspot data", () => {
    const hotspots = collectBoardHotspots(
      normalizeBoardDocument({
        title: "T",
        activeViewId: "v1",
        views: [
          {
            ...createEmptyBoardView({ id: "v1", name: "A" }),
            elements: [
              { id: "h1", type: "hotspot", label: "One", x: 0, y: 0 },
              { id: "h2", type: "hotspot", label: "Two", x: 0, y: 0 },
            ],
          },
        ],
      }),
    );
    const { active, excluded } = partitionHotspotsForMeasuresView(hotspots, [
      hotspotRefKey("v1", "h1"),
    ]);
    expect(active).toHaveLength(1);
    expect(active[0]?.elementId).toBe("h2");
    expect(excluded).toHaveLength(1);
    expect(excluded[0]?.elementId).toBe("h1");
  });
});

describe("findMeasureForHotspot", () => {
  it("matches targetRef", () => {
    const item: MeasureActionItem = {
      id: generateStormId(),
      title: "M",
      actionType: "IMPROVE",
      obligation: "Recommended",
      qualities: [],
      status: "open",
      targetRef: { viewId: "v1", elementId: "h1", elementLabel: "x" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(findMeasureForHotspot([item], "v1", "h1")?.id).toBe(item.id);
    expect(findMeasureForHotspot([item], "v1", "other")).toBeUndefined();
  });
});
