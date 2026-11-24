import { describe, expect, it } from "vitest";

import { drawioModelSyncKey } from "@/lib/drawio/board-sync-key";

describe("drawioModelSyncKey", () => {
  it("is stable for the same slice", () => {
    const slice = {
      title: "A",
      elements: [{ id: "e1", type: "domainEvent" as const, label: "X", x: 0, y: 0, width: 10, height: 10 }],
      connectors: [],
      relations: [],
      swimlanes: [],
      boundedContexts: [],
      canvasLines: [],
      timeline: { visible: true, y: 0 },
      appearance: { canvas: "#fff", sidebar: "#fff", diagramStyle: "clean" as const },
      customCardTypes: [],
      notesCompact: false,
    };
    expect(drawioModelSyncKey(slice)).toBe(drawioModelSyncKey({ ...slice }));
  });
});