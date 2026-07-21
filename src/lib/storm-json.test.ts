import { describe, expect, it } from "vitest";

import {
  BOARD_SNAPSHOT_SCHEMA_ID,
  stableBoardStateKey,
  boardExportTextsEquivalent,
  buildBoardSnapshot,
  boardSnapshotSchema,
  boardSnapshotToReplacePayload,
} from "@/lib/storm-json";
import { suggestPastTense, validateBoard } from "@/lib/relation-validation";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import type { BoardImportPayload } from "@/lib/storm-json";

const emptyBoard: BoardImportPayload = {
  title: "Test",
  modelingMode: "eventStorming",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [],
  relations: [],
  contextRelations: [],
  swimlanes: [],
  boundedContexts: [],
  timeline: { y: 400 },
  viewport: { x: 0, y: 0, zoom: 1 },
  glossary: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: true,
  snapToGrid: false,
};

describe("storm-json", () => {
  it("embeds $schema pointing at the published schema id", () => {
    const snap = buildBoardSnapshot({ ...emptyBoard, elements: [], relations: [], swimlanes: [], boundedContexts: [], glossary: [] });
    expect(snap.$schema).toBe(BOARD_SNAPSHOT_SCHEMA_ID);
    expect(boardSnapshotSchema.$id).toBe(BOARD_SNAPSHOT_SCHEMA_ID);
    expect(boardSnapshotSchema.properties.format.const).toBe("event-storming-tool");
  });

  it("stable key ignores exportedAt", () => {
    const base = { ...emptyBoard, elements: [], relations: [], swimlanes: [], boundedContexts: [], glossary: [] };
    const a = buildBoardSnapshot(base);
    const b = buildBoardSnapshot({ ...base, viewport: { x: 10, y: 20, zoom: 1.5 } });
    expect(stableBoardStateKey(boardSnapshotToReplacePayload(a))).toBe(
      stableBoardStateKey(boardSnapshotToReplacePayload(b)),
    );
  });

  it("detects equivalent exports", () => {
    const payload = {
      ...emptyBoard,
      title: "Board",
      elements: [{ id: "1", type: "domainEvent" as const, label: "Order Placed", x: 0, y: 0 }],
      relations: [],
      swimlanes: [],
      boundedContexts: [],
      glossary: [],
    };
    const json1 = JSON.stringify(buildBoardSnapshot(payload));
    const json2 = JSON.stringify(buildBoardSnapshot(payload));
    expect(boardExportTextsEquivalent(json1, json2)).toBe(true);
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
