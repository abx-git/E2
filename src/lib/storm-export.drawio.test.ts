import { describe, expect, it } from "vitest";
import { buildDrawioMxFile } from "@/lib/storm-export";
import type { BoardActiveSlice } from "@/lib/storm-json";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";

const sample: BoardActiveSlice = {
  title: "Demo Board",
  modelingMode: "eventStorming",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [
    {
      id: "agg-1",
      type: "aggregate",
      label: "Order",
      x: 80,
      y: 70,
      width: 280,
      height: 200,
      zIndex: 0,
    },
    {
      id: "evt-1",
      type: "domainEvent",
      label: "Order Placed",
      x: 120,
      y: 80,
      width: 160,
      height: 72,
      zIndex: 1,
    },
    {
      id: "cmd-1",
      type: "command",
      label: "Place Order",
      x: 120,
      y: 200,
      width: 150,
      height: 68,
      zIndex: 2,
    },
    {
      id: "note-1",
      type: "note",
      label: "Check stock\nbefore packing",
      x: 500,
      y: 90,
      width: 160,
      height: 100,
      zIndex: 3,
    },
  ],
  relations: [
    {
      id: "rel-1",
      type: "triggers",
      sourceId: "cmd-1",
      targetId: "evt-1",
      label: "after validation",
    },
  ],
  contextRelations: [
    {
      id: "ctx-1",
      type: "customerSupplier",
      sourceContextId: "bc-1",
      targetContextId: "bc-1",
    },
  ],
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
  canvasLines: [
    {
      id: "line-1",
      x1: 40,
      y1: 40,
      x2: 200,
      y2: 40,
      arrowHead: "end",
      label: "flow",
    },
  ],
  timeline: { ...DEFAULT_TIMELINE, y: 160, visible: true },
  viewport: { ...DEFAULT_VIEWPORT },
  glossary: [],
  actionItems: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: false,
  snapToGrid: false,
  customCardTypes: [],
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
    expect(mx).toContain("Domain Event");
    expect(mx).toContain("Command");
    expect(mx).toContain("Aggregate Root");
    expect(mx).toContain("Notiz");
    expect(mx).toMatch(/<diagram[^>]*>\s*<mxGraphModel/);
  });

  it("uses IBM Plex Sans and matches E2 paint order (edges under stickies)", () => {
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

    expect(mx).toContain("fontFamily=IBM Plex Sans");
    expect(mx).toContain("absoluteArcSize=1");
    expect(mx).toContain("fillOpacity=38");
    expect(mx).toContain("shape=partialRectangle");
    expect(mx).toContain("strokeColor=#e9c46a");
    expect(mx).toContain("id=\"line_line-1\"");
    expect(mx).toContain("after validation");
    expect(mx).not.toContain("löst aus");

    const relAt = mx.indexOf('id="rel_rel-1"');
    const evtAt = mx.indexOf('id="el_evt-1"');
    const aggAt = mx.indexOf('id="el_agg-1"');
    const cmdAt = mx.indexOf('id="el_cmd-1"');
    expect(relAt).toBeGreaterThan(0);
    expect(evtAt).toBeGreaterThan(relAt);
    expect(aggAt).toBeGreaterThan(0);
    expect(aggAt).toBeLessThan(evtAt);
    expect(cmdAt).toBeGreaterThan(evtAt);
    expect(mx).toContain("dashed=1");
  });
});
