import { describe, expect, it } from "vitest";

import {
  BOARD_SNAPSHOT_SCHEMA_ID,
  EXPORT_VERSION,
  activeSliceFromDocument,
  boardExportTextsEquivalent,
  boardSnapshotSchema,
  boardSnapshotToReplacePayload,
  buildBoardSnapshot,
  createDefaultBoardDocument,
  createEmptyBoardView,
  migrateV1ToDocument,
  stableBoardStateKey,
  type BoardImportPayload,
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
    expect(allowed).toEqual(["domainEvent", "note"]);
  });

  it("allows ES catalog when facilitator off", () => {
    const allowed = getAllowedTypesForPhase("eventStorming", "bigPicture", 0, false);
    expect(allowed.length).toBe(11);
  });

  it("uses DDD catalog in DDD free mode", () => {
    const allowed = getAllowedTypesForPhase("domainDrivenDesign", "free", 0, false);
    expect(allowed).toContain("entity");
    expect(allowed).toContain("subdomain");
    expect(allowed).not.toContain("command");
  });

  it("restricts strategic design phase 1", () => {
    const allowed = getAllowedTypesForPhase("domainDrivenDesign", "strategicDesign", 0, true);
    expect(allowed).toEqual(["subdomain", "note", "hotspot"]);
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
      "hotspot",
    ]);
  });
});
