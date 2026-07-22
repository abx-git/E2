import { describe, expect, it } from "vitest";
import { buildDrawioMxFile } from "@/lib/storm-export";
import type { BoardImportPayload } from "@/lib/storm-json";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";

const sample: BoardImportPayload = {
  title: "Demo Board",
  modelingMode: "eventStorming",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [
    {
      id: "evt-1",
      type: "domainEvent",
      label: "Order Placed",
      x: 120,
      y: 80,
      width: 160,
      height: 72,
    },
    {
      id: "cmd-1",
      type: "command",
      label: "Place Order",
      x: 120,
      y: 200,
      width: 150,
      height: 68,
    },
  ],
  relations: [
    {
      id: "rel-1",
      type: "triggers",
      sourceId: "cmd-1",
      targetId: "evt-1",
    },
  ],
  contextRelations: [],
  swimlanes: [
    {
      id: "lane-1",
      label: "Checkout",
      x: 0,
      y: 40,
      width: 800,
      height: 320,
      color: "rgba(148,163,184,0.18)",
    },
  ],
  boundedContexts: [
    {
      id: "bc-1",
      label: "Ordering",
      x: 40,
      y: 60,
      width: 400,
      height: 280,
      color: "#dbeafe",
    },
  ],
  timeline: { ...DEFAULT_TIMELINE, y: 160, visible: true },
  viewport: { ...DEFAULT_VIEWPORT },
  glossary: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: false,
  snapToGrid: false,
};

describe("buildDrawioMxFile", () => {
  it("embeds an uncompressed mxGraphModel suitable for draw.io SVG content", () => {
    const bounds = {
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 400,
      width: 960,
      height: 560,
      ox: 80,
      oy: 80,
    };
    const mx = buildDrawioMxFile(sample, bounds);

    expect(mx.startsWith("<mxfile")).toBe(true);
    expect(mx).toContain("<mxGraphModel");
    expect(mx).toContain('<mxCell id="0"/>');
    expect(mx).toContain('<mxCell id="1" parent="0"/>');
    expect(mx).toContain('id="el_evt-1"');
    expect(mx).toContain('id="el_cmd-1"');
    expect(mx).toContain('source="el_cmd-1"');
    expect(mx).toContain('target="el_evt-1"');
    expect(mx).toContain('id="lane_lane-1"');
    expect(mx).toContain('id="bc_bc-1"');
    expect(mx).toContain('id="timeline"');
    expect(mx).toContain("Order Placed");
    // Diagram payload must be child XML (not compressed text-only).
    expect(mx).toMatch(/<diagram[^>]*>\s*<mxGraphModel/);
  });
});
