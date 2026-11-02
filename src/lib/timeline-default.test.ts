import { describe, expect, it } from "vitest";

import { createEmptyBoardView, normalizeBoardView } from "@/lib/storm-json";
import {
  defaultTimelineForModelingMode,
  modelingModeUsesTimelineByDefault,
} from "@/types/storm-element";

describe("timeline defaults (opt-in)", () => {
  it("does not enable timeline or snap by modeling mode", () => {
    for (const mode of [
      "eventStorming",
      "eventModeling",
      "processFlow",
      "c4",
      "freeform",
    ] as const) {
      expect(modelingModeUsesTimelineByDefault(mode)).toBe(false);
      expect(defaultTimelineForModelingMode(mode).visible).toBe(false);
    }
  });

  it("applies opt-out defaults on new views", () => {
    const es = createEmptyBoardView({ id: "1", name: "ES", modelingMode: "eventStorming" });
    expect(es.timeline.visible).toBe(false);
    expect(es.snapToTimeline).toBe(false);
  });

  it("keeps explicit visible:true on import", () => {
    const imported = normalizeBoardView({
      id: "v",
      name: "Storm",
      modelingMode: "eventStorming",
      timeline: { y: 300, visible: true },
      snapToTimeline: true,
    });
    expect(imported.timeline.visible).toBe(true);
    expect(imported.snapToTimeline).toBe(true);
  });

  it("hides timeline when visible is omitted on import", () => {
    const imported = normalizeBoardView({
      id: "v",
      name: "Storm",
      modelingMode: "eventStorming",
      timeline: { y: 300 },
    });
    expect(imported.timeline.visible).toBe(false);
    expect(imported.snapToTimeline).toBe(false);
  });
});
