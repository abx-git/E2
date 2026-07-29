import { describe, expect, it } from "vitest";

import {
  lineLength,
  normalizeCanvasLine,
  normalizeCanvasLines,
  normalizeViewBookmark,
  normalizeViewBookmarks,
} from "@/lib/canvas-annotations";

describe("canvas-annotations", () => {
  it("normalizes a valid canvas line", () => {
    const line = normalizeCanvasLine({
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 50,
      arrowHead: "end",
      label: " Hinweis ",
    });
    expect(line).toMatchObject({
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 50,
      arrowHead: "end",
      label: "Hinweis",
    });
    expect(line?.id).toBeTruthy();
  });

  it("rejects invalid coordinates and falls back arrow heads", () => {
    expect(normalizeCanvasLine({ x1: 0, y1: 0 })).toBeNull();
    const line = normalizeCanvasLine({
      x1: 1,
      y1: 2,
      x2: 3,
      y2: 4,
      arrowHead: "invalid" as never,
    });
    expect(line?.arrowHead).toBe("none");
  });

  it("normalizes line arrays from import payloads", () => {
    const lines = normalizeCanvasLines([
      { id: "l1", x1: 0, y1: 0, x2: 10, y2: 10 },
      { x1: 1 },
      null,
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.id).toBe("l1");
  });

  it("normalizes bookmarks with viewport and view", () => {
    const bookmark = normalizeViewBookmark({
      name: " Start ",
      viewId: "view-1",
      viewport: { x: 10, y: 20, zoom: 1.25 },
    });
    expect(bookmark).toMatchObject({
      name: "Start",
      viewId: "view-1",
      viewport: { x: 10, y: 20, zoom: 1.25 },
    });
    expect(bookmark?.id).toBeTruthy();
  });

  it("rejects bookmarks without name, view, or viewport", () => {
    expect(normalizeViewBookmark({ name: "  ", viewId: "v1" })).toBeNull();
    expect(
      normalizeViewBookmark({
        name: "X",
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    ).toBeNull();
    expect(
      normalizeViewBookmark({
        name: "X",
        viewport: { x: 0, y: 0 } as never,
      }),
    ).toBeNull();
  });

  it("normalizes bookmark arrays with fallback view id", () => {
    const bookmarks = normalizeViewBookmarks(
      [{ id: "b1", name: "One", viewport: { x: 0, y: 0, zoom: 1 } }],
      "fallback-view",
    );
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]!.id).toBe("b1");
    expect(bookmarks[0]!.viewId).toBe("fallback-view");
  });

  it("computes line length", () => {
    expect(lineLength({ x1: 0, y1: 0, x2: 3, y2: 4 })).toBe(5);
  });
});
