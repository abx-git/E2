import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  bindTabWorkingFileName,
  getOrCreateTabSessionId,
  getTabWorkingFileContext,
  normalizeWorkingFilename,
  readFilenameFromUrl,
  resolvePreferredWorkingFileName,
  setTabWorkingFileContext,
  syncFilenameInUrl,
  WORKING_FILE_URL_PARAM,
} from "@/lib/working-file-tab-context";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  };
}

describe("working-file-tab-context", () => {
  let href = "http://localhost/";

  beforeEach(() => {
    href = "http://localhost/";
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: session,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        get location() {
          return new URL(href);
        },
        history: {
          replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
            if (url != null) href = new URL(String(url), href).toString();
          },
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "sessionStorage");
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("normalizes filenames for keys / locks", () => {
    expect(normalizeWorkingFilename("  Projekt-A.storm.json ")).toBe("projekt-a.storm.json");
    expect(normalizeWorkingFilename("path/to/Board.JSON")).toBe("board.json");
    expect(normalizeWorkingFilename("")).toBe("");
  });

  it("creates a stable tab session id in sessionStorage", () => {
    const a = getOrCreateTabSessionId();
    const b = getOrCreateTabSessionId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  it("reads filename from URL", () => {
    expect(readFilenameFromUrl("?filename=alpha.storm.json&room=ABCD")).toBe("alpha.storm.json");
    expect(readFilenameFromUrl("?room=ABCD")).toBe(null);
  });

  it("syncs filename into the URL without dropping other params", () => {
    href = "http://localhost/?room=ZZZZ";
    syncFilenameInUrl("beta.storm.json");
    const params = new URLSearchParams(new URL(href).search);
    expect(params.get(WORKING_FILE_URL_PARAM)).toBe("beta.storm.json");
    expect(params.get("room")).toBe("ZZZZ");
    syncFilenameInUrl(null);
    const cleared = new URLSearchParams(new URL(href).search);
    expect(cleared.get(WORKING_FILE_URL_PARAM)).toBe(null);
    expect(cleared.get("room")).toBe("ZZZZ");
  });

  it("stores tab context in sessionStorage", () => {
    setTabWorkingFileContext("gamma.storm.json");
    expect(getTabWorkingFileContext().filename).toBe("gamma.storm.json");
    expect(getTabWorkingFileContext().attachedAt).toBeTypeOf("number");
    setTabWorkingFileContext(null);
    expect(getTabWorkingFileContext().filename).toBe(null);
  });

  it("resolves preferred name: URL > session > localStorage", () => {
    localStorage.setItem("e2-last-working-file-name", "from-ls.storm.json");
    setTabWorkingFileContext("from-session.storm.json");
    expect(resolvePreferredWorkingFileName()).toBe("from-session.storm.json");

    href = "http://localhost/?filename=from-url.storm.json";
    expect(resolvePreferredWorkingFileName()).toBe("from-url.storm.json");
  });

  it("falls back to localStorage when URL and session are empty", () => {
    localStorage.setItem("e2-last-working-file-name", "legacy.storm.json");
    expect(resolvePreferredWorkingFileName()).toBe("legacy.storm.json");
  });

  it("bindTabWorkingFileName updates session and URL together", () => {
    bindTabWorkingFileName("bound.storm.json");
    expect(getTabWorkingFileContext().filename).toBe("bound.storm.json");
    expect(readFilenameFromUrl()).toBe("bound.storm.json");
  });
});
