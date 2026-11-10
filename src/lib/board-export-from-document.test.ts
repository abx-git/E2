import { describe, expect, it } from "vitest";

import {
  boardExportSliceFromDocument,
  boardExportSliceFromJson,
} from "@/lib/board-export-from-document";
import {
  buildBoardSnapshot,
  createDefaultBoardDocument,
  stringifyExportedDocument,
} from "@/lib/storm-json";
import { buildBoardSvgString } from "@/lib/storm-export";

describe("board-export-from-document", () => {
  it("builds SVG from JSON without browser", () => {
    const doc = createDefaultBoardDocument({ title: "Render test" });
    const view = doc.views[0]!;
    if (!("elements" in view)) throw new Error("expected canvas view");
    view.elements = [
      {
        id: "e1",
        type: "domainEvent",
        label: "Paid",
        x: 40,
        y: 40,
      },
    ];
    const payload = buildBoardSnapshot(doc);
    const slice = boardExportSliceFromDocument(payload);
    expect(slice).not.toBeNull();
    const svg = buildBoardSvgString(slice!);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Paid");
  });

  it("round-trips from export text", () => {
    const doc = createDefaultBoardDocument({ title: "X" });
    const json = stringifyExportedDocument(buildBoardSnapshot(doc));
    expect(boardExportSliceFromJson(json)).not.toBeNull();
  });
});
