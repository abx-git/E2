import { describe, expect, it } from "vitest";

import { extractElementAttributeClipboard } from "@/lib/element-attribute-clipboard";
import {
  buildLayoutRegionAttributeClipboard,
  extractLayoutRegionAppearanceMetadata,
  planLayoutRegionAppearancePaste,
} from "@/lib/region-appearance-clipboard";
import { resolveRegionLabelInk } from "@/lib/region-style";
import type { StormElement } from "@/types/storm-element";

describe("region-appearance-clipboard", () => {
  it("extracts effective paint when metadata is empty", () => {
    const meta = extractLayoutRegionAppearanceMetadata({
      id: "l1",
      type: "swimlane",
      label: "Lane",
      x: 0,
      y: 0,
    });
    expect(meta?.regionColor).toBe("#94a3b8");
    expect(meta?.regionFillOpacity).toBeCloseTo(0.12);
    const clip = buildLayoutRegionAttributeClipboard({
      id: "l1",
      type: "swimlane",
      label: "Lane",
      x: 0,
      y: 0,
    });
    expect(clip.metadata.regionColor).toBe("#94a3b8");
  });

  it("pastes only region paint between swimlane and bounded context", () => {
    const clip = extractElementAttributeClipboard({
      id: "src",
      type: "swimlane",
      label: "Lane A",
      x: 0,
      y: 0,
      metadata: {
        regionColor: "#ff0000",
        regionFillOpacity: 0.33,
        regionBorderColor: "#00ff00",
        regionBorderOpacity: 0.5,
        regionLabelColor: "#abcdef",
        regionLabelOpacity: 0.9,
      },
    });
    const target: StormElement = {
      id: "tgt",
      type: "boundedContext",
      label: "BC",
      x: 10,
      y: 20,
      metadata: { regionColor: "#111111" },
    };
    const plan = planLayoutRegionAppearancePaste(target, clip);
    expect(plan).not.toBeNull();
    expect(plan!.patch.type).toBeUndefined();
    expect(plan!.patch.label).toBeUndefined();
    expect(plan!.patch.metadata?.regionColor).toBe("#ff0000");
    expect(plan!.patch.metadata?.regionFillOpacity).toBeCloseTo(0.33);
    expect(plan!.patch.metadata?.regionLabelColor).toBe("#abcdef");
    expect(plan!.warnings).toEqual([]);
  });

  it("returns null when clipboard has no region paint", () => {
    const clip = extractElementAttributeClipboard({
      id: "src",
      type: "command",
      label: "Cmd",
      x: 0,
      y: 0,
      metadata: {},
    });
    const plan = planLayoutRegionAppearancePaste(
      { id: "tgt", type: "swimlane", label: "L", x: 0, y: 0 },
      clip,
    );
    expect(plan).toBeNull();
  });
});

describe("resolveRegionLabelInk", () => {
  it("uses explicit label color when set", () => {
    const ink = resolveRegionLabelInk("swimlane", {
      labelColor: "#ff00aa",
      labelOpacity: 0.8,
    });
    expect(ink.ink).toBe("rgba(255,0,170,0.8)");
  });
});
