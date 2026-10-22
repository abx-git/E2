import { describe, expect, it } from "vitest";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import {
  prepareImportedViewsAsNewPages,
  remapBoardViewIds,
  uniqueViewName,
} from "@/lib/board-view-import";
import { createEmptyBoardView } from "@/lib/storm-json";
import type { BoardImportPayload } from "@/lib/storm-json";
import type { StormElement } from "@/types/storm-element";

function el(
  partial: Partial<StormElement> & Pick<StormElement, "id" | "x" | "y">,
): StormElement {
  return {
    type: "domainEvent",
    label: "Event",
    width: 100,
    height: 50,
    ...partial,
  };
}

describe("uniqueViewName", () => {
  it("keeps base when free", () => {
    expect(uniqueViewName("Import", ["Board"])).toBe("Import");
  });

  it("suffixes on collision", () => {
    expect(uniqueViewName("Board", ["Board", "Board (2)"])).toBe("Board (3)");
  });
});

describe("remapBoardViewIds", () => {
  it("assigns new ids and remaps relations / regions", () => {
    const view = createEmptyBoardView({
      id: "v-old",
      name: "Quelle",
      elements: [
        el({ id: "e1", x: 0, y: 0, swimlaneId: "s1", boundedContextId: "bc1" }),
        el({ id: "e2", x: 40, y: 0, type: "command", label: "Cmd" }),
      ],
      relations: [{ id: "r1", type: "triggers", sourceId: "e2", targetId: "e1" }],
      swimlanes: [{ id: "s1", label: "Lane", x: 0, y: 0, width: 800, height: 120 }],
      boundedContexts: [{ id: "bc1", label: "BC", x: 0, y: 0, width: 200, height: 100 }],
      contextRelations: [],
    });

    const viewIdMap = new Map([["v-old", "v-new"]]);
    const remapped = remapBoardViewIds(view, { viewIdMap, newName: "Importiert" });

    expect(remapped.id).toBe("v-new");
    expect(remapped.name).toBe("Importiert");
    expect(remapped.elements[0]!.id).not.toBe("e1");
    expect(remapped.elements[1]!.id).not.toBe("e2");
    expect(remapped.swimlanes[0]!.id).not.toBe("s1");
    expect(remapped.boundedContexts[0]!.id).not.toBe("bc1");
    expect(remapped.elements[0]!.swimlaneId).toBe(remapped.swimlanes[0]!.id);
    expect(remapped.elements[0]!.boundedContextId).toBe(remapped.boundedContexts[0]!.id);
    expect(remapped.relations).toHaveLength(1);
    expect(remapped.relations[0]!.sourceId).toBe(remapped.elements[1]!.id);
    expect(remapped.relations[0]!.targetId).toBe(remapped.elements[0]!.id);
  });

  it("remaps connector endpoints when element ids change", () => {
    const view = createEmptyBoardView({
      id: "v-old",
      name: "Quelle",
      elements: [
        el({ id: "e1", x: 0, y: 0, type: "command", label: "Cmd" }),
        el({ id: "e2", x: 40, y: 0 }),
      ],
      relations: [{ id: "r1", type: "triggers", sourceId: "e2", targetId: "e1" }],
      connectors: [
        {
          id: "c1",
          source: { attach: "element", id: "e2" },
          target: { attach: "element", id: "e1" },
          arrowHead: "end",
          relationType: "triggers",
          labelMode: "type",
        },
      ],
    });

    const remapped = remapBoardViewIds(view, { viewIdMap: new Map([["v-old", "v-new"]]) });

    expect(remapped.connectors).toHaveLength(1);
    const conn = remapped.connectors[0]!;
    expect(conn.id).not.toBe("c1");
    expect(conn.source.attach).toBe("element");
    expect(conn.target.attach).toBe("element");
    if (conn.source.attach !== "element" || conn.target.attach !== "element") {
      throw new Error("expected element endpoints");
    }
    const cmd = remapped.elements.find((e) => e.type === "command")!;
    const evt = remapped.elements.find((e) => e.type === "domainEvent")!;
    expect(conn.source.id).toBe(evt.id);
    expect(conn.target.id).toBe(cmd.id);
    expect(remapped.relations[0]!.sourceId).toBe(conn.source.id);
    expect(remapped.relations[0]!.targetId).toBe(conn.target.id);
  });

  it("remaps link sticky view targets via viewIdMap", () => {
    const view = createEmptyBoardView({
      id: "v-a",
      name: "A",
      elements: [
        el({
          id: "link1",
          x: 0,
          y: 0,
          type: "link",
          label: "Zu B",
          metadata: { linkKind: "view", linkViewId: "v-b" },
        }),
      ],
    });
    const viewIdMap = new Map([
      ["v-a", "new-a"],
      ["v-b", "new-b"],
    ]);
    const remapped = remapBoardViewIds(view, { viewIdMap });
    expect(remapped.elements[0]!.metadata?.linkViewId).toBe("new-b");
  });
});

describe("prepareImportedViewsAsNewPages", () => {
  it("names a single Board view after the document title", () => {
    const imported: BoardImportPayload = {
      title: "Workshop Alpha",
      glossary: [{ term: "X", definition: "Y" }],
      appearance: { ...DEFAULT_APPEARANCE, canvas: "#ff0000" },
      workshopMode: true,
      activeViewId: "v1",
      views: [
        createEmptyBoardView({
          id: "v1",
          name: "Board",
          elements: [el({ id: "e1", x: 1, y: 2 })],
        }),
      ],
    };
    const prepared = prepareImportedViewsAsNewPages(imported, ["Board"]);
    expect(prepared.views).toHaveLength(1);
    expect(prepared.views[0]!.name).toBe("Workshop Alpha");
    expect(prepared.views[0]!.id).not.toBe("v1");
    expect(prepared.views[0]!.elements[0]!.id).not.toBe("e1");
    expect(prepared.activeViewId).toBe(prepared.views[0]!.id);
  });

  it("prefixes multi-view imports with document title", () => {
    const imported: BoardImportPayload = {
      title: "Paket",
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      workshopMode: false,
      activeViewId: "v2",
      views: [
        createEmptyBoardView({ id: "v1", name: "Eins" }),
        createEmptyBoardView({ id: "v2", name: "Zwei" }),
      ],
    };
    const prepared = prepareImportedViewsAsNewPages(imported, []);
    expect(prepared.views.map((v) => v.name)).toEqual(["Paket — Eins", "Paket — Zwei"]);
    expect(prepared.activeViewId).toBe(prepared.views[1]!.id);
  });
});
