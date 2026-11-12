import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BOARD_AUTO_LOAD_PARAM,
  BOARD_EXPORT_PARAM,
  BOARD_EXPORT_VIEW_PARAM,
  BOARD_URL_PARAM,
  buildBoardShareAppUrl,
  checkBoardSourceUrl,
  fetchAndValidateRemoteBoard,
  readBoardAutoLoadFromSearch,
  readBoardUrlFromSearch,
  readExportFormatFromSearch,
  readExportViewIdFromSearch,
} from "@/lib/board-remote-url";
import { buildBoardSnapshot, createDefaultBoardDocument, stringifyExportedDocument } from "@/lib/storm-json";

describe("board-remote-url", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts https and localhost http", () => {
    expect(checkBoardSourceUrl("https://cdn.example/board.e2.json").ok).toBe(true);
    expect(checkBoardSourceUrl("http://localhost:3000/a.json").ok).toBe(true);
    expect(checkBoardSourceUrl("http://example.com/a.json").ok).toBe(false);
    expect(checkBoardSourceUrl("ftp://x").ok).toBe(false);
  });

  it("reads boardAutoLoad flag", () => {
    expect(readBoardAutoLoadFromSearch(`?${BOARD_AUTO_LOAD_PARAM}=1`)).toBe(true);
    expect(readBoardAutoLoadFromSearch(`?${BOARD_AUTO_LOAD_PARAM}=0`)).toBe(false);
    expect(readBoardAutoLoadFromSearch("")).toBe(false);
  });

  it("reads export and view params", () => {
    const q = `?${BOARD_EXPORT_PARAM}=e2v&${BOARD_EXPORT_VIEW_PARAM}=view-a`;
    expect(readExportFormatFromSearch(q)).toBe("e2v");
    expect(readExportViewIdFromSearch(q)).toBe("view-a");
    expect(readExportFormatFromSearch("?export=pdf")).toBeNull();
  });

  it("reads and builds the board share param", () => {
    const source = "https://cdn.example/w.e2.json";
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

    const result = await fetchAndValidateRemoteBoard("https://cdn.example/board.e2.json", {
      appHref: "https://pages.example/E2/",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("Workshop");
    expect(result.viewCount).toBe(1);
    expect(result.elementCount).toBe(1);
    expect(result.shareUrl).toContain(`${BOARD_URL_PARAM}=`);
    expect(new URL(result.shareUrl).searchParams.get(BOARD_URL_PARAM)).toBe(
      "https://cdn.example/board.e2.json",
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
    expect(result.reason).toMatch(/schema|valid|gültig/i);
  });
});
