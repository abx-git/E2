import { describe, expect, it } from "vitest";

import {
  connectorHitStrokeWidth,
  connectorMxDash,
  connectorStrokeDasharray,
  defaultRelationStrokeStyle,
  relationCanvasCaption,
  resolveRelationStrokeStyle,
} from "@/lib/connector-style";

describe("connector-style", () => {
  it("keeps informs/annotates dashed unless overridden", () => {
    expect(defaultRelationStrokeStyle("triggers")).toBe("solid");
    expect(defaultRelationStrokeStyle("informs")).toBe("dashed");
    expect(resolveRelationStrokeStyle({ type: "annotates" })).toBe("dashed");
    expect(resolveRelationStrokeStyle({ type: "annotates", strokeStyle: "dotted" })).toBe("dotted");
  });

  it("shows type or free text depending on labelMode", () => {
    expect(relationCanvasCaption({ type: "triggers" })).toBe("");
    expect(relationCanvasCaption({ type: "triggers", label: "custom" })).toBe("custom");
    expect(relationCanvasCaption({ type: "triggers", labelMode: "type", label: "custom" })).toBe(
      "löst aus",
    );
    expect(relationCanvasCaption({ type: "triggers", labelMode: "custom", label: "  hi  " })).toBe(
      "hi",
    );
    expect(relationCanvasCaption({ type: "triggers", labelMode: "custom" })).toBe("");
  });

  it("maps stroke styles to svg, canvas, and draw.io dashes", () => {
    expect(connectorStrokeDasharray("solid")).toBeUndefined();
    expect(connectorStrokeDasharray("dashed")).toBe("8 5");
    expect(connectorStrokeDasharray("dotted")).toBe("2 3.5");
    expect(connectorMxDash("solid")).toEqual({});
    expect(connectorMxDash("dotted")).toEqual({ dashed: 1, dashPattern: "1 3" });
  });

  it("widens the hit stroke when zoomed out", () => {
    expect(connectorHitStrokeWidth(1)).toBeGreaterThanOrEqual(16);
    expect(connectorHitStrokeWidth(0.25)).toBeGreaterThan(connectorHitStrokeWidth(1));
  });
});
