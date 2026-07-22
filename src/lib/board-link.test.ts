import { describe, expect, it, vi, afterEach } from "vitest";

import {
  activateBoardLink,
  linkHasTarget,
  normalizeExternalUrl,
} from "@/lib/board-link";
import type { StormElement } from "@/types/storm-element";

vi.mock("@/store/storm-board-store", () => {
  const state = {
    views: [
      { id: "v1", name: "Board" },
      { id: "v2", name: "Prozess" },
    ],
    activeViewId: "v1",
    setActiveView: vi.fn((id: string) => {
      state.activeViewId = id;
    }),
  };
  return {
    useStormBoardStore: Object.assign(() => state, {
      getState: () => state,
    }),
  };
});

function linkEl(meta: StormElement["metadata"]): StormElement {
  return {
    id: "l1",
    type: "link",
    label: "Link",
    x: 0,
    y: 0,
    metadata: meta,
  };
}

describe("board-link", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes URLs", () => {
    expect(normalizeExternalUrl("example.com/path")).toBe("https://example.com/path");
    expect(normalizeExternalUrl("https://a.test")).toBe("https://a.test/");
    expect(normalizeExternalUrl("ftp://x")).toBeNull();
    expect(normalizeExternalUrl("")).toBeNull();
  });

  it("detects configured targets", () => {
    expect(linkHasTarget(linkEl({ linkKind: "external", linkUrl: "https://a.test" }))).toBe(true);
    expect(linkHasTarget(linkEl({ linkKind: "view", linkViewId: "v2" }))).toBe(true);
    expect(linkHasTarget(linkEl({ linkKind: "external" }))).toBe(false);
  });

  it("opens external links", () => {
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { open });
    const result = activateBoardLink(
      linkEl({ linkKind: "external", linkUrl: "example.com" }),
    );
    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledWith(
      "https://example.com/",
      "_blank",
      "noopener,noreferrer",
    );
    vi.unstubAllGlobals();
  });

  it("switches board views", async () => {
    const { useStormBoardStore } = await import("@/store/storm-board-store");
    const result = activateBoardLink(linkEl({ linkKind: "view", linkViewId: "v2" }));
    expect(result).toEqual({
      ok: true,
      kind: "view",
      viewId: "v2",
      viewName: "Prozess",
    });
    expect(useStormBoardStore.getState().setActiveView).toHaveBeenCalledWith("v2");
  });
});
