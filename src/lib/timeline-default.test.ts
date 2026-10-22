import { describe, expect, it } from "vitest";

import { createEmptyBoardView, normalizeBoardView } from "@/lib/storm-json";
import {
  defaultTimelineForModelingMode,
  modelingModeUsesTimelineByDefault,
} from "@/types/storm-element";

describe("timeline defaults by modeling mode", () => {
  it("enables timeline for time-oriented methods", () => {
    for (const mode of ["eventStorming", "eventModeling", "processFlow"] as const) {
      expect(modelingModeUsesTimelineByDefault(mode)).toBe(true);
      expect(defaultTimelineForModelingMode(mode).visible).toBe(true);
    }
  });

  it("hides timeline for architecture, data, and other non-timeline methods", () => {
    for (const mode of [
      "dataModel",
      "c4",
      "arc42",
      "cloud",
      "domainDrivenDesign",
      "bdd",
      "userStoryMapping",
      "freeform",
    ] as const) {
      expect(modelingModeUsesTimelineByDefault(mode)).toBe(false);
      expect(defaultTimelineForModelingMode(mode).visible).toBe(false);
    }
  });

  it("applies defaults on new views", () => {
    const es = createEmptyBoardView({ id: "1", name: "ES", modelingMode: "eventStorming" });
    expect(es.timeline.visible).toBe(true);
    expect(es.snapToTimeline).toBe(true);

    const c4 = createEmptyBoardView({ id: "2", name: "C4", modelingMode: "c4" });
    expect(c4.timeline.visible).toBe(false);
    expect(c4.snapToTimeline).toBe(false);
  });

  it("infers visibility on import when timeline.visible is omitted", () => {
    const imported = normalizeBoardView({
      id: "v",
      name: "Cloud",
      modelingMode: "cloud",
      timeline: { y: 300 },
    });
    expect(imported.timeline.visible).toBe(false);

    const legacy = normalizeBoardView({
      id: "v2",
      name: "Storm",
      modelingMode: "eventStorming",
      timeline: { y: 300 },
    });
    expect(legacy.timeline.visible).toBe(true);
  });
});
