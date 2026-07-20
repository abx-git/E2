import { describe, expect, it } from "vitest";

import {
  BOARD_SNAPSHOT_SCHEMA_ID,
  stableBoardStateKey,
  boardExportTextsEquivalent,
  buildBoardSnapshot,
  boardSnapshotSchema,
} from "@/lib/storm-json";
import { suggestPastTense, validateBoard } from "@/lib/relation-validation";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";

describe("storm-json", () => {
  it("embeds $schema pointing at the published schema id", () => {
    const snap = buildBoardSnapshot({
      title: "Test",
      workshopFormat: "free",
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [],
      relations: [],
      swimlanes: [],
      boundedContexts: [],
      timeline: { y: 400 },
      viewport: { x: 0, y: 0, zoom: 1 },
      glossary: [],
      snapToTimeline: true,
      snapToGrid: false,
    });
    expect(snap.$schema).toBe(BOARD_SNAPSHOT_SCHEMA_ID);
    expect(boardSnapshotSchema.$id).toBe(BOARD_SNAPSHOT_SCHEMA_ID);
    expect(boardSnapshotSchema.properties.format.const).toBe("event-storming-tool");
  });

  it("stable key ignores exportedAt", () => {
    const base = {
      title: "Test",
      workshopFormat: "free" as const,
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [],
      relations: [],
      swimlanes: [],
      boundedContexts: [],
      timeline: { y: 400 },
      viewport: { x: 0, y: 0, zoom: 1 },
      glossary: [],
      snapToTimeline: true,
      snapToGrid: false,
    };
    const a = buildBoardSnapshot(base);
    const b = buildBoardSnapshot({ ...base, viewport: { x: 10, y: 20, zoom: 1.5 } });
    expect(stableBoardStateKey(a)).toBe(stableBoardStateKey(b));
  });

  it("detects equivalent exports", () => {
    const payload = {
      title: "Board",
      workshopFormat: "free" as const,
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [{ id: "1", type: "domainEvent" as const, label: "Order Placed", x: 0, y: 0 }],
      relations: [],
      swimlanes: [],
      boundedContexts: [],
      timeline: { y: 400 },
      viewport: { x: 0, y: 0, zoom: 1 },
      glossary: [],
      snapToTimeline: true,
      snapToGrid: false,
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
    const allowed = getAllowedTypesForPhase("bigPicture", 0, true);
    expect(allowed).toEqual(["domainEvent"]);
  });

  it("allows all types when facilitator off", () => {
    const allowed = getAllowedTypesForPhase("bigPicture", 0, false);
    expect(allowed.length).toBe(10);
  });
});
