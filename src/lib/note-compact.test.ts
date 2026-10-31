import { describe, expect, it } from "vitest";

import {
  NOTE_COMPACT_SIZE_PX,
  elementCanvasBounds,
  noteExportRect,
  noteUsesCompactLayout,
} from "@/lib/note-compact";
import type { StormElement } from "@/types/storm-element";

const note: StormElement = {
  id: "n1",
  type: "note",
  label: "Hinweis",
  x: 10,
  y: 20,
  width: 200,
  height: 120,
};

describe("note-compact", () => {
  it("detects compact layout only for notes when enabled", () => {
    expect(noteUsesCompactLayout(note, false)).toBe(false);
    expect(noteUsesCompactLayout(note, true)).toBe(true);
    expect(noteUsesCompactLayout({ ...note, type: "event" }, true)).toBe(false);
  });

  it("shrinks export/canvas bounds for compact notes", () => {
    expect(noteExportRect(note, false, 160, 100)).toEqual({
      x: 10,
      y: 20,
      w: 200,
      h: 120,
    });
    expect(noteExportRect(note, true, 160, 100)).toEqual({
      x: 10,
      y: 20,
      w: NOTE_COMPACT_SIZE_PX,
      h: NOTE_COMPACT_SIZE_PX,
    });
    expect(elementCanvasBounds(note, true).w).toBe(NOTE_COMPACT_SIZE_PX);
  });
});
