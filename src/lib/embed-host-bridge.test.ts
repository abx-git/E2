import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createEmbedHostBridge } from "@/lib/embed-host-bridge";
import {
  EMBED_DOCUMENT_MESSAGE,
  EMBED_LOAD_MESSAGE,
  EMBED_READY_MESSAGE,
  EMBED_REQUEST_SAVE_MESSAGE,
} from "@/lib/embed-messages";
import {
  buildBoardSnapshot,
  createDefaultBoardDocument,
  stringifyExportedDocument,
} from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";

describe("embed-host-bridge", () => {
  const parentOrigin = "https://fsidx.example";
  const posted: unknown[] = [];

  beforeEach(() => {
    posted.length = 0;
    const parent = { postMessage: (data: unknown) => posted.push(data) };
    vi.stubGlobal("window", {
      ...globalThis.window,
      parent,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts ready with host protocol", () => {
    const bridge = createEmbedHostBridge({ allowedParentOrigins: [parentOrigin] });
    bridge.postReady();
    expect(posted.some((m) => (m as { type?: string }).type === EMBED_READY_MESSAGE)).toBe(true);
  });

  it("loads board and exports on request-save", () => {
    const doc = createDefaultBoardDocument({ title: "Host test" });
    const json = stringifyExportedDocument(buildBoardSnapshot(doc));
    const bridge = createEmbedHostBridge({ allowedParentOrigins: [parentOrigin] });

    bridge.handleMessage({
      origin: parentOrigin,
      data: {
        type: EMBED_LOAD_MESSAGE,
        json,
        hostFileId: "proj/board.e2.json",
        editable: true,
      },
    } as MessageEvent);

    expect(useStormBoardStore.getState().title).toBe("Host test");

    bridge.handleMessage({
      origin: parentOrigin,
      data: { type: EMBED_REQUEST_SAVE_MESSAGE, hostFileId: "proj/board.e2.json" },
    } as MessageEvent);

    const docMsg = posted.find(
      (m) => (m as { type?: string }).type === EMBED_DOCUMENT_MESSAGE,
    ) as { reason?: string; hostFileId?: string } | undefined;
    expect(docMsg?.reason).toBe("flush");
    expect(docMsg?.hostFileId).toBe("proj/board.e2.json");
  });
});