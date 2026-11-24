import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import { applyPayloadToYDoc, readPayloadFromYDoc } from "@/lib/collab/yjs-board";
import { buildBoardSnapshot, isBoardSnapshot } from "@/lib/storm-json";

/** Draw.io layout coalescing still ends in the same Yjs payload shape collab expects. */
describe("drawio + yjs collab payload", () => {
  it("keeps board-snapshot schema after element geometry patch", () => {
    const doc = new Y.Doc();
    const base = {
      format: "event-storming-tool" as const,
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      title: "Collab",
      views: [
        {
          id: "v1",
          name: "Main",
          modelingMode: "eventStorming" as const,
          elements: [
            {
              id: "e1",
              type: "domainEvent" as const,
              label: "Evt",
              x: 10,
              y: 20,
              width: 120,
              height: 60,
            },
          ],
          relations: [],
          contextRelations: [],
          swimlanes: [],
          boundedContexts: [],
          canvasLines: [],
          connectors: [],
        },
      ],
      activeViewId: "v1",
      glossary: [],
      appearance: { canvas: "#f8fafc", sidebar: "#ffffff", diagramStyle: "clean" as const },
    };
    applyPayloadToYDoc(doc, base as never);
    const read = readPayloadFromYDoc(doc);
    expect(read).not.toBeNull();
    const snap = buildBoardSnapshot(read!);
    expect(isBoardSnapshot(snap)).toBe(true);

    const moved = structuredClone(read!);
    const view = moved.views![0]!;
    view.elements[0]!.x = 99;
    applyPayloadToYDoc(doc, moved as never, "drawio-sync");
    const read2 = readPayloadFromYDoc(doc);
    expect(read2?.views?.[0]?.elements?.[0]?.x).toBe(99);
  });
});