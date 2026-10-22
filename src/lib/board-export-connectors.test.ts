import { describe, expect, it } from "vitest";
import { connectorsForExport, connectorExportGeometry } from "@/lib/board-export-connectors";
import { exportCanvasBackground } from "@/lib/board-export-visual";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import type { BoardActiveSlice } from "@/lib/storm-json";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";

const baseSlice = (): BoardActiveSlice => ({
  title: "T",
  glossary: [],
  actionItems: [],
  appearance: { ...DEFAULT_APPEARANCE },
  modelingMode: "eventStorming",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [
    { id: "a", type: "command", label: "A", x: 0, y: 0, width: 100, height: 60 },
    { id: "b", type: "domainEvent", label: "B", x: 200, y: 0, width: 100, height: 60 },
  ],
  relations: [],
  contextRelations: [],
  swimlanes: [{ id: "lane-1", label: "L", x: 0, y: 0, width: 400, height: 200 }],
  boundedContexts: [],
  canvasLines: [],
  timeline: { ...DEFAULT_TIMELINE },
  viewport: { ...DEFAULT_VIEWPORT },
  snapToTimeline: false,
  snapToGrid: false,
  customCardTypes: [],
});

describe("board export connectors", () => {
  it("uses board appearance canvas color for export background", () => {
    expect(exportCanvasBackground({ canvas: "#e8ecf1", sidebar: "#fff" })).toBe("#e8ecf1");
  });

  it("includes swimlane-attached connectors not present in legacy relations", () => {
    const slice = baseSlice();
    slice.connectors = [
      {
        id: "c1",
        source: { attach: "element", id: "a" },
        target: { attach: "swimlane", id: "lane-1" },
        arrowHead: "end",
      },
    ];
    expect(connectorsForExport(slice)).toHaveLength(1);
    const geom = connectorExportGeometry(slice.connectors[0]!, slice.elements, slice.swimlanes, slice.boundedContexts, 0, 0);
    expect(geom).not.toBeNull();
    expect(geom!.start.x).toBeGreaterThanOrEqual(0);
    expect(geom!.end.y).toBeGreaterThanOrEqual(0);
  });
});
