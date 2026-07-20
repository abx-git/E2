import { describe, expect, it } from "vitest";

import {
  applyPayloadToYDoc,
  createBoardYDoc,
  encodeYDocState,
  applyYDocState,
  readPayloadFromYDoc,
} from "@/lib/collab/yjs-board";
import { generateRoomCode, hashHostToken, isCollabConfigured } from "@/lib/collab/config";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";
import type { BoardImportPayload } from "@/lib/storm-json";

const sample: BoardImportPayload = {
  title: "Collab Test",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [
    {
      id: "e1",
      type: "domainEvent",
      label: "Order Placed",
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    },
  ],
  relations: [],
  contextRelations: [],
  swimlanes: [],
  boundedContexts: [],
  timeline: { ...DEFAULT_TIMELINE },
  viewport: { ...DEFAULT_VIEWPORT },
  glossary: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: true,
  snapToGrid: false,
};

describe("collab yjs-board", () => {
  it("round-trips payload through Y.Doc", () => {
    const doc = createBoardYDoc();
    applyPayloadToYDoc(doc, sample);
    const read = readPayloadFromYDoc(doc);
    expect(read?.title).toBe("Collab Test");
    expect(read?.elements).toHaveLength(1);
    expect(read?.elements[0]?.label).toBe("Order Placed");
  });

  it("encodes and re-applies state update", () => {
    const a = createBoardYDoc();
    applyPayloadToYDoc(a, sample);
    const update = encodeYDocState(a);
    const b = createBoardYDoc();
    applyYDocState(b, update);
    expect(readPayloadFromYDoc(b)?.title).toBe("Collab Test");
  });
});

describe("collab config", () => {
  it("generates room codes of expected length", () => {
    const code = generateRoomCode(6);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("hashes host tokens stably", async () => {
    const h1 = await hashHostToken("abc");
    const h2 = await hashHostToken("abc");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("reports collab unconfigured without env", () => {
    expect(isCollabConfigured()).toBe(false);
  });
});
