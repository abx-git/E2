import { describe, expect, it } from "vitest";

import {
  boardImportPayloadFromE2vText,
  buildE2vSelectionClipboardPackage,
  decodeE2vText,
  encodeE2vSingleView,
  extractE2vFromClipboardText,
  mergeImportedViewIntoCanvas,
  sliceCanvasViewForSelection,
} from "@/lib/e2v";
import { createDefaultBoardDocument, createEmptyBoardView } from "@/lib/storm-json";
import type { BoardConnector } from "@/types/board-connector";

describe("E2V selection apply", () => {
  const baseView = createEmptyBoardView({
    id: "view-1",
    name: "Flow",
    elements: [
      { id: "e1", type: "domainEvent", label: "A", x: 10, y: 20, width: 160, height: 72 },
      { id: "e2", type: "command", label: "B", x: 200, y: 20, width: 160, height: 72 },
      { id: "e3", type: "actor", label: "C", x: 400, y: 20, width: 80, height: 40 },
    ],
    relations: [],
    connectors: [
      {
        id: "cn-keep",
        source: { attach: "element", id: "e1" },
        target: { attach: "element", id: "e2" },
        label: "link",
      } satisfies BoardConnector,
    ],
  });

  const doc = createDefaultBoardDocument({ title: "T", views: [baseView] });

  it("preserveStableIds keeps element and connector ids from encoded selection", () => {
    const slice = sliceCanvasViewForSelection(baseView, {
      selection: { elementIds: ["e1", "e2"] },
    })!;
    const pack = buildE2vSelectionClipboardPackage(doc, slice);
    const data = extractE2vFromClipboardText(pack);
    const decoded = boardImportPayloadFromE2vText(data, { preserveStableIds: true })!;
    const v = decoded.views[0]!;
    if (v.type === "actions") throw new Error("canvas expected");
    expect(v.elements.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
    expect(v.connectors).toHaveLength(1);
    expect(v.connectors[0]?.id).toBe("cn-keep");
  });

  it("merge keeps connectors when LLM omits cn rows", () => {
    const slice = sliceCanvasViewForSelection(baseView, {
      selection: { elementIds: ["e1", "e2"] },
    })!;
    const e2v = encodeE2vSingleView(
      { ...doc, views: [slice] },
      slice.id,
    )!;
    const lines = e2v.split("\n").filter((l) => !l.startsWith("cn\t"));
    const patchText = lines.join("\n");
    const patchView = boardImportPayloadFromE2vText(patchText, { preserveStableIds: true })!
      .views[0]!;
    if (patchView.type === "actions") throw new Error("canvas");
    expect(patchView.connectors).toHaveLength(0);

    const merged = mergeImportedViewIntoCanvas(baseView, patchView);
    expect(merged.connectors).toHaveLength(1);
    expect(merged.connectors[0]?.id).toBe("cn-keep");
  });

  it("reconciles shorthand cn rows to existing connector ids", () => {
    const slice = sliceCanvasViewForSelection(baseView, {
      selection: { elementIds: ["e1", "e2"] },
    })!;
    const full = encodeE2vSingleView({ ...doc, views: [slice] }, slice.id)!;
    const decoded = decodeE2vText(full, { preserveStableIds: true })!;
    const v = decoded.views[0]!;
    if (v.type === "actions") throw new Error("canvas");
    const shorthand = full
      .split("\n")
      .filter((l) => !l.startsWith("cn\t"))
      .concat("cn\telement:e0\telement:e1")
      .join("\n");
    const patchView = boardImportPayloadFromE2vText(shorthand, { preserveStableIds: true })!
      .views[0]!;
    if (patchView.type === "actions") throw new Error("canvas");
    const merged = mergeImportedViewIntoCanvas(baseView, patchView);
    expect(merged.connectors).toHaveLength(1);
    expect(merged.connectors[0]?.id).toBe("cn-keep");
  });
});
