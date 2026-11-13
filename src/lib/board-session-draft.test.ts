import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearBoardSessionDraft,
  readBoardSessionDraft,
  saveBoardSessionDraft,
} from "@/lib/board-session-draft";

describe("board-session-draft", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
    });
    vi.stubGlobal("crypto", {
      randomUUID: () => "test-tab-session",
    });
    storage.set("e2.working-file.tab-session-id", "tab-a");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips draft JSON per tab session", () => {
    saveBoardSessionDraft('{"title":"Demo"}');
    expect(readBoardSessionDraft()).toBe('{"title":"Demo"}');
    clearBoardSessionDraft();
    expect(readBoardSessionDraft()).toBeNull();
  });
});
