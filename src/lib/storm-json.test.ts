import { describe, expect, it } from "vitest";

import { effectiveElementRotation } from "@/lib/element-rotation";
import { resolveElementStyle } from "@/lib/element-styles";
import {
  BOARD_SNAPSHOT_SCHEMA_ID,
  EXPORT_VERSION,
  activeSliceFromDocument,
  boardDocumentContentEquivalent,
  boardExportTextsEquivalent,
  boardSnapshotSchema,
  boardSnapshotToReplacePayload,
  buildBoardSnapshot,
  createDefaultBoardDocument,
  createEmptyBoardView,
  migrateV1ToDocument,
  normalizeStormElement,
  stableBoardStateKey,
  stringifyExportedDocument,
  type BoardImportPayload,
  type BoardSnapshotV2,
  type BoardSnapshotV1,
} from "@/lib/storm-json";
import { suggestPastTense, validateBoard } from "@/lib/relation-validation";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";

function emptyDoc(overrides: Partial<BoardImportPayload> = {}): BoardImportPayload {
  return createDefaultBoardDocument({
    title: "Test",
    ...overrides,
  });
}

describe("storm-json multi-view", () => {
  it("embeds $schema pointing at the published v2 schema id", () => {
    const snap = buildBoardSnapshot(emptyDoc());
    expect(snap.$schema).toBe(BOARD_SNAPSHOT_SCHEMA_ID);
    expect(snap.version).toBe(EXPORT_VERSION);
    expect(boardSnapshotSchema.$id).toBe(BOARD_SNAPSHOT_SCHEMA_ID);
    expect(boardSnapshotSchema.properties.version.const).toBe(2);
  });

  it("stable key ignores exportedAt and viewport", () => {
    const base = emptyDoc();
    const a = buildBoardSnapshot(base);
    const b = buildBoardSnapshot({
      ...base,
      views: base.views.map((v) => ({
        ...v,
        viewport: { x: 10, y: 20, zoom: 1.5 },
      })),
    });
    expect(stableBoardStateKey(boardSnapshotToReplacePayload(a))).toBe(
      stableBoardStateKey(boardSnapshotToReplacePayload(b)),
    );
  });

  it("migrates v1 flat snapshot into a single view", () => {
    const v1: BoardSnapshotV1 = {
      format: "event-storming-tool",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      title: "Alt",
      modelingMode: "domainDrivenDesign",
      workshopFormat: "free",
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [
        { id: "e1", type: "entity", label: "Order", x: 0, y: 0 },
      ],
      relations: [],
      swimlanes: [],
      boundedContexts: [],
      timeline: { y: 400 },
      viewport: { x: 0, y: 0, zoom: 1 },
      glossary: [{ term: "Order", definition: "Bestellung" }],
      appearance: { ...DEFAULT_APPEARANCE },
      snapToTimeline: true,
      snapToGrid: false,
    };
    const doc = migrateV1ToDocument(v1);
    expect(doc.title).toBe("Alt");
    expect(doc.glossary).toHaveLength(1);
    expect(doc.views).toHaveLength(1);
    expect(doc.views[0]!.name).toBe("Board");
    expect(doc.views[0]!.modelingMode).toBe("domainDrivenDesign");
    expect(doc.views[0]!.elements).toHaveLength(1);
    expect(doc.activeViewId).toBe(doc.views[0]!.id);
    expect(doc.workshopMode).toBe(false);

    const slice = activeSliceFromDocument(doc);
    expect(slice.elements[0]!.label).toBe("Order");
    expect(slice.title).toBe("Alt");
  });

  it("round-trips multi-view export text", () => {
    const viewA = createEmptyBoardView({ id: "a", name: "A" });
    const viewB = createEmptyBoardView({
      id: "b",
      name: "B",
      elements: [{ id: "x", type: "domainEvent", label: "X", x: 1, y: 2 }],
    });
    const payload = emptyDoc({
      title: "Board",
      activeViewId: "b",
      views: [viewA, viewB],
      workshopMode: true,
    });
    const json1 = JSON.stringify(buildBoardSnapshot(payload));
    const json2 = JSON.stringify(buildBoardSnapshot(payload));
    expect(boardExportTextsEquivalent(json1, json2)).toBe(true);
    const restored = boardSnapshotToReplacePayload(buildBoardSnapshot(payload));
    expect(restored.views).toHaveLength(2);
    expect(restored.workshopMode).toBe(true);
    expect(restored.activeViewId).toBe("b");
  });

  it("treats activeViewId as export metadata for document content equivalence", () => {
    const viewA = createEmptyBoardView({ id: "a", name: "A" });
    const viewB = createEmptyBoardView({
      id: "b",
      name: "B",
      elements: [{ id: "x", type: "domainEvent", label: "X", x: 1, y: 2 }],
    });
    const onA = stringifyExportedDocument(
      buildBoardSnapshot(emptyDoc({ activeViewId: "a", views: [viewA, viewB] })),
    );
    const onB = stringifyExportedDocument(
      buildBoardSnapshot(emptyDoc({ activeViewId: "b", views: [viewA, viewB] })),
    );
    expect(boardExportTextsEquivalent(onA, onB)).toBe(false);
    expect(boardDocumentContentEquivalent(onA, onB)).toBe(true);
  });

  it("stores bookmarks at document level and lifts legacy per-view bookmarks", () => {
    const view = createEmptyBoardView({ id: "view-a", name: "Sicht A" });
    const doc = boardSnapshotToReplacePayload(
      buildBoardSnapshot({
        ...emptyDoc({ views: [view] }),
        bookmarks: [
          {
            id: "b1",
            name: "Global",
            viewId: "view-a",
            viewport: { x: 1, y: 2, zoom: 1.1 },
          },
        ],
      }),
    );
    expect(doc.bookmarks).toHaveLength(1);
    expect(doc.bookmarks?.[0]).toMatchObject({
      id: "b1",
      name: "Global",
      viewId: "view-a",
    });
    expect(doc.views[0]).not.toHaveProperty("bookmarks");

    const lifted = boardSnapshotToReplacePayload(
      buildBoardSnapshot({
        ...emptyDoc({
          views: [
            {
              ...view,
              bookmarks: [
                {
                  id: "legacy",
                  name: "Alt",
                  viewport: { x: 0, y: 0, zoom: 1 },
                },
              ],
            } as never,
          ],
        }),
      }),
    );
    expect(lifted.bookmarks).toHaveLength(1);
    expect(lifted.bookmarks?.[0]).toMatchObject({
      id: "legacy",
      name: "Alt",
      viewId: "view-a",
    });
  });

  it("migrates arc42Section stickies and maps unknown types to notes", () => {
    expect(normalizeStormElement({ id: "a", type: "arc42Section", label: "S1", x: 1, y: 2 }).type).toBe(
      "archBlackbox",
    );
    const unknown = normalizeStormElement({
      id: "u",
      type: "notARealType",
      label: "Weird",
      x: 8,
      y: 9,
      width: 160,
      height: 72,
    });
    expect(unknown.type).toBe("note");
    expect(unknown.width).toBe(160);
    expect(unknown.height).toBe(72);
  });

  it("JSON paste of unknown sticky types does not throw on rotation", () => {
    const snap: BoardSnapshotV2 = {
      format: "event-storming-tool",
      version: 2,
      exportedAt: "2026-01-01T00:00:00.000Z",
      title: "Paste",
      glossary: [],
      workshopMode: false,
      activeViewId: "v1",
      views: [
        {
          ...createEmptyBoardView({ id: "v1", name: "Board" }),
          elements: [
            {
              id: "e1",
              type: "mysteryCard" as never,
              label: "Imported",
              x: 40,
              y: 50,
              width: 160,
              height: 72,
            },
          ],
        },
      ],
      appearance: { ...DEFAULT_APPEARANCE },
    };
    const doc = boardSnapshotToReplacePayload(snap);
    const el = doc.views[0]!.elements[0]!;
    expect(el.type).toBe("note");
    const style = resolveElementStyle(el);
    expect(style).toBeDefined();
    expect(() => effectiveElementRotation(el.rotation, style.rotation)).not.toThrow();
  });
});

describe("relation-validation", () => {
  it("suggests past tense for events", () => {
    expect(suggestPastTense("Place Order")).toBeTruthy();
    expect(suggestPastTense("Order Placed")).toBeNull();
  });

  it("warns on command right of event", () => {
    const elements = [
      { id: "c", type: "command" as const, label: "Place Order", x: 300, y: 0 },
      { id: "e", type: "domainEvent" as const, label: "Order Placed", x: 100, y: 0 },
    ];
    const relations = [{ id: "r", type: "triggers" as const, sourceId: "c", targetId: "e" }];
    const warnings = validateBoard(elements, relations).filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("facilitator-phases", () => {
  it("restricts types in phase 1 big picture", () => {
    const allowed = getAllowedTypesForPhase("eventStorming", "bigPicture", 0, true);
    expect(allowed).toEqual(["domainEvent", "note", "instruction"]);
  });

  it("allows ES catalog when facilitator off", () => {
    const allowed = getAllowedTypesForPhase("eventStorming", "bigPicture", 0, false);
    expect(allowed.length).toBe(13);
  });

  it("uses DDD catalog in DDD free mode", () => {
    const allowed = getAllowedTypesForPhase("domainDrivenDesign", "free", 0, false);
    expect(allowed).toContain("entity");
    expect(allowed).toContain("subdomain");
    expect(allowed).not.toContain("command");
  });

  it("restricts strategic design phase 1", () => {
    const allowed = getAllowedTypesForPhase("domainDrivenDesign", "strategicDesign", 0, true);
    expect(allowed).toEqual(["subdomain", "note", "instruction", "hotspot"]);
  });

  it("uses BDD catalog", () => {
    const allowed = getAllowedTypesForPhase("bdd", "free", 0, false);
    expect(allowed).toContain("rule");
    expect(allowed).toContain("example");
    expect(allowed).not.toContain("entity");
  });

  it("uses USM and Event Modeling catalogs", () => {
    expect(getAllowedTypesForPhase("userStoryMapping", "free", 0, false)).toContain("userStory");
    expect(getAllowedTypesForPhase("eventModeling", "free", 0, false)).toContain("slice");
    expect(getAllowedTypesForPhase("eventModeling", "eventModelingWorkshop", 0, true)).toEqual([
      "domainEvent",
      "slice",
      "note",
      "instruction",
      "hotspot",
    ]);
  });

  it("keeps catalog order so new phase types append below", () => {
    const phase0 = getAllowedTypesForPhase("eventStorming", "bigPicture", 0, true);
    const phase3 = getAllowedTypesForPhase("eventStorming", "bigPicture", 3, true);
    expect(phase0).toEqual(["domainEvent", "note", "instruction"]);
    // Commands/actors appear after events/pivotal; annotations stay at the bottom.
    expect(phase3).toEqual([
      "domainEvent",
      "pivotalEvent",
      "command",
      "actor",
      "note",
      "instruction",
      "hotspot",
    ]);
  });

  it("uses Process and Data catalogs", () => {
    expect(getAllowedTypesForPhase("processFlow", "free", 0, false)).toContain("processActivity");
    expect(getAllowedTypesForPhase("processFlow", "free", 0, false)).toContain("processGateway");
    expect(getAllowedTypesForPhase("processFlow", "processWorkshop", 0, true)).toEqual([
      "processStart",
      "processActivity",
      "processEnd",
      "note",
      "instruction",
    ]);
    expect(getAllowedTypesForPhase("dataModel", "free", 0, false)).toContain("dataEntity");
    expect(getAllowedTypesForPhase("dataModel", "free", 0, false)).toContain("dataAssociation");
    expect(getAllowedTypesForPhase("dataModel", "dataModelWorkshop", 0, true)).toContain("dataEntity");
  });

  it("uses Architecture mode catalogs separately", () => {
    expect(getAllowedTypesForPhase("c4", "free", 0, false)).toEqual(
      expect.arrayContaining(["c4Person", "c4SoftwareSystem", "c4Container", "c4Component"]),
    );
    expect(getAllowedTypesForPhase("c4", "free", 0, false)).not.toContain("archBlackbox");
    expect(getAllowedTypesForPhase("c4", "free", 0, false)).not.toContain("cloudBoundary");

    expect(getAllowedTypesForPhase("arc42", "free", 0, false)).toEqual(
      expect.arrayContaining(["archBlackbox", "archWhitebox", "archComponent"]),
    );
    expect(getAllowedTypesForPhase("arc42", "free", 0, false)).not.toContain("c4Person");
    expect(getAllowedTypesForPhase("arc42", "free", 0, false)).not.toContain("cloudCompute");

    expect(getAllowedTypesForPhase("cloud", "free", 0, false)).toEqual(
      expect.arrayContaining(["cloudBoundary", "cloudCompute", "cloudManagedService"]),
    );
    expect(getAllowedTypesForPhase("cloud", "free", 0, false)).not.toContain("c4SoftwareSystem");
    expect(getAllowedTypesForPhase("cloud", "free", 0, false)).not.toContain("archBlackbox");

    expect(getAllowedTypesForPhase("c4", "c4Modeling", 0, true)).toEqual([
      "c4Person",
      "c4SoftwareSystem",
      "note",
      "instruction",
      "link",
    ]);
    expect(getAllowedTypesForPhase("arc42", "arc42Workshop", 0, true)).toEqual([
      "archBlackbox",
      "note",
      "instruction",
      "hotspot",
      "link",
    ]);
    expect(getAllowedTypesForPhase("cloud", "cloudArchitecture", 0, true)).toEqual([
      "cloudBoundary",
      "cloudManagedService",
      "note",
      "instruction",
      "hotspot",
      "link",
    ]);
  });
});
