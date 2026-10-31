import { describe, expect, it } from "vitest";

import {
  NOTE_COMPACT_SIZE_PX,
  elementCanvasBounds,
  noteExportRect,
  patchNoteCompactMetadata,
  resolveNoteCompactLayout,
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
  it("uses view default when no per-note override", () => {
    expect(resolveNoteCompactLayout(note, false)).toBe(false);
    expect(resolveNoteCompactLayout(note, true)).toBe(true);
    expect(resolveNoteCompactLayout({ ...note, type: "event" }, true)).toBe(false);
  });

  it("honours per-note metadata override over view default", () => {
    expect(
      resolveNoteCompactLayout(
        { ...note, metadata: { noteCompact: true } },
        false,
      ),
    ).toBe(true);
    expect(
      resolveNoteCompactLayout(
        { ...note, metadata: { noteCompact: false } },
        true,
      ),
    ).toBe(false);
  });

  it("shrinks export/canvas bounds when compact", () => {
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
    expect(elementCanvasBounds({ ...note, metadata: { noteCompact: true } }, false).w).toBe(
      NOTE_COMPACT_SIZE_PX,
    );
  });

  it("patchNoteCompactMetadata clears override", () => {
    expect(patchNoteCompactMetadata({ noteCompact: true, noteColor: "cream" }, undefined)).toEqual({
      noteColor: "cream",
    });
    expect(patchNoteCompactMetadata(undefined, true)).toEqual({ noteCompact: true });
  });
});
