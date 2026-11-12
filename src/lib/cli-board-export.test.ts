import { describe, expect, it } from "vitest";

import { buildHeadlessBoardExport, inferRenderFormatFromOutPath, isHeadlessExportFormat } from "@/lib/cli-board-export";
import { E2V_MAGIC } from "@/lib/e2v/constants";
import { buildBoardSnapshot, createDefaultBoardDocument } from "@/lib/storm-json";

describe("cli-board-export", () => {
  it("recognizes export formats", () => {
    expect(isHeadlessExportFormat("e2v")).toBe(true);
    expect(isHeadlessExportFormat("json")).toBe(true);
    expect(isHeadlessExportFormat("png")).toBe(false);
  });

  it("infers output format from extension", () => {
    expect(inferRenderFormatFromOutPath("x.drawio.svg")).toBe("svg");
    expect(inferRenderFormatFromOutPath("x.e2v.txt")).toBe("e2v");
    expect(inferRenderFormatFromOutPath("x.e2.json")).toBe("json");
    expect(inferRenderFormatFromOutPath("x.png")).toBe("png");
  });

  it("exports JSON, E2V, and SVG from a board document", () => {
    const doc = createDefaultBoardDocument({ title: "CLI export" });
    const view = doc.views[0]!;
    if (!("elements" in view)) throw new Error("expected canvas");
    view.elements = [{ id: "e1", type: "domainEvent", label: "Shipped", x: 12, y: 24 }];
    const snap = buildBoardSnapshot(doc);

    const json = buildHeadlessBoardExport(snap, { format: "json" });
    expect(json.ok).toBe(true);
    if (!json.ok) return;
    expect(json.body).toContain('"format": "event-storming-tool"');
    expect(json.filename).toMatch(/\.e2\.json$/);

    const e2v = buildHeadlessBoardExport(snap, { format: "e2v" });
    expect(e2v.ok).toBe(true);
    if (!e2v.ok) return;
    expect(e2v.body.startsWith(E2V_MAGIC)).toBe(true);

    const svg = buildHeadlessBoardExport(snap, { format: "svg" });
    expect(svg.ok).toBe(true);
    if (!svg.ok) return;
    expect(svg.body).toContain("<svg");
    expect(svg.body).toContain("Shipped");
  });

  it("exports single-view JSON when view id is set", () => {
    const doc = createDefaultBoardDocument({ title: "Views" });
    const view = doc.views[0]!;
    if (!("elements" in view)) throw new Error("expected canvas");
    const single = buildHeadlessBoardExport(buildBoardSnapshot(doc), {
      format: "json",
      viewId: view.id,
    });
    expect(single.ok).toBe(true);
    if (!single.ok) return;
    const parsed = JSON.parse(single.body) as { views: unknown[]; activeViewId: string };
    expect(parsed.views).toHaveLength(1);
    expect(parsed.activeViewId).toBe(view.id);
  });
});
