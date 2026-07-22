import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import {
  applyPayloadToYDoc,
  createBoardYDoc,
  encodeYDocState,
  applyYDocState,
  readPayloadFromYDoc,
} from "@/lib/collab/yjs-board";
import {
  clearLocalSupabaseConnection,
  generateRoomCode,
  getSupabaseConnectionSource,
  hashHostToken,
  isCollabConfigured,
  saveLocalSupabaseConnection,
} from "@/lib/collab/config";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { createDefaultBoardDocument, createEmptyBoardView } from "@/lib/storm-json";
import type { BoardImportPayload } from "@/lib/storm-json";

const sample: BoardImportPayload = createDefaultBoardDocument({
  title: "Collab Test",
  activeViewId: "v1",
  views: [
    createEmptyBoardView({
      id: "v1",
      name: "Board",
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
    }),
  ],
  appearance: { ...DEFAULT_APPEARANCE },
});

describe("collab yjs-board", () => {
  it("round-trips multi-view payload through Y.Doc", () => {
    const doc = createBoardYDoc();
    applyPayloadToYDoc(doc, sample);
    const read = readPayloadFromYDoc(doc);
    expect(read?.title).toBe("Collab Test");
    expect(read?.views).toHaveLength(1);
    expect(read?.views[0]?.elements).toHaveLength(1);
    expect(read?.views[0]?.elements[0]?.label).toBe("Order Placed");
  });

  it("migrates legacy flat v1-shaped Y payload", () => {
    const doc = createBoardYDoc();
    const root = doc.getMap("board");
    doc.transact(() => {
      root.set(
        "payloadJson",
        JSON.stringify({
          title: "Legacy",
          modelingMode: "eventStorming",
          workshopFormat: "free",
          facilitatorEnabled: false,
          facilitatorPhase: 0,
          elements: [{ id: "e1", type: "command", label: "Go", x: 0, y: 0 }],
          relations: [],
          swimlanes: [],
          boundedContexts: [],
          timeline: { y: 400 },
          viewport: { x: 0, y: 0, zoom: 1 },
          glossary: [],
          appearance: { ...DEFAULT_APPEARANCE },
          snapToTimeline: true,
          snapToGrid: false,
        }),
      );
    });
    const read = readPayloadFromYDoc(doc);
    expect(read?.title).toBe("Legacy");
    expect(read?.views).toHaveLength(1);
    expect(read?.views[0]?.elements[0]?.label).toBe("Go");
  });

  it("encodes and re-applies state update", () => {
    const a = createBoardYDoc();
    applyPayloadToYDoc(a, sample);
    const update = encodeYDocState(a);
    const b = createBoardYDoc();
    applyYDocState(b, update);
    expect(readPayloadFromYDoc(b)?.title).toBe("Collab Test");
  });

  it("syncs incremental edits between two docs", () => {
    const a = createBoardYDoc();
    const b = createBoardYDoc();
    applyPayloadToYDoc(a, sample);
    applyYDocState(b, encodeYDocState(a));

    a.on("update", (u) => {
      Y.applyUpdate(b, u);
    });

    const next = createDefaultBoardDocument({
      ...sample,
      title: "Updated",
      views: [
        createEmptyBoardView({
          id: "v1",
          name: "Board",
          elements: [
            ...sample.views[0]!.elements,
            {
              id: "e2",
              type: "command",
              label: "Place Order",
              x: 40,
              y: 60,
              width: 100,
              height: 50,
            },
          ],
        }),
      ],
    });
    applyPayloadToYDoc(a, next);

    expect(readPayloadFromYDoc(b)?.title).toBe("Updated");
    expect(readPayloadFromYDoc(b)?.views[0]?.elements).toHaveLength(2);
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

  it("reports collab unconfigured without env or local storage", () => {
    expect(isCollabConfigured()).toBe(false);
  });

  it("accepts local browser connection when env is absent", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    vi.stubGlobal("window", { localStorage: globalThis.localStorage });

    const saved = saveLocalSupabaseConnection({
      url: "https://example.supabase.co",
      key: "sb_publishable_test",
    });
    expect(saved).toEqual({ ok: true });
    expect(isCollabConfigured()).toBe(true);
    expect(getSupabaseConnectionSource()).toBe("local");

    clearLocalSupabaseConnection();
    expect(isCollabConfigured()).toBe(false);

    vi.unstubAllGlobals();
  });
});
