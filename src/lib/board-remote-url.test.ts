import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BOARD_URL_PARAM,
  buildBoardShareAppUrl,
  checkBoardSourceUrl,
  fetchAndValidateRemoteBoard,
  readBoardUrlFromSearch,
} from "@/lib/board-remote-url";
import { buildBoardSnapshot, createDefaultBoardDocument, stringifyExportedDocument } from "@/lib/storm-json";

describe("board-remote-url", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts https and localhost http", () => {
    expect(checkBoardSourceUrl("https://cdn.example/board.storm.json").ok).toBe(true);
    expect(checkBoardSourceUrl("http://localhost:3000/a.json").ok).toBe(true);
    expect(checkBoardSourceUrl("http://example.com/a.json").ok).toBe(false);
    expect(checkBoardSourceUrl("ftp://x").ok).toBe(false);
  });

  it("reads and builds the board share param", () => {
    const source = "https://cdn.example/w.storm.json";
    expect(readBoardUrlFromSearch(`?room=ABCD&${BOARD_URL_PARAM}=${encodeURIComponent(source)}`)).toBe(
      source,
    );
    expect(readBoardUrlFromSearch("?room=ABCD")).toBeNull();

    const share = buildBoardShareAppUrl(source, "https://app.example/E2/?wf=1");
    const parsed = new URL(share);
    expect(parsed.searchParams.get(BOARD_URL_PARAM)).toBe(source);
    expect(parsed.searchParams.get("wf")).toBe("1");
  });

  it("validates a fetched storm.json and builds a share link", async () => {
    const doc = createDefaultBoardDocument({ title: "Workshop" });
    doc.views[0]!.elements = [{ id: "e1", type: "domainEvent", label: "Ordered", x: 0, y: 0 }];
    const json = stringifyExportedDocument(buildBoardSnapshot(doc));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(json, { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    );

    const result = await fetchAndValidateRemoteBoard("https://cdn.example/board.storm.json", {
      appHref: "https://pages.example/E2/",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("Workshop");
    expect(result.viewCount).toBe(1);
    expect(result.elementCount).toBe(1);
    expect(result.shareUrl).toContain(`${BOARD_URL_PARAM}=`);
    expect(new URL(result.shareUrl).searchParams.get(BOARD_URL_PARAM)).toBe(
      "https://cdn.example/board.storm.json",
    );
  });

  it("rejects non-board JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"hello":"world"}', { status: 200 })),
    );
    const result = await fetchAndValidateRemoteBoard("https://cdn.example/x.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/Schema|gültiges/i);
  });
});
