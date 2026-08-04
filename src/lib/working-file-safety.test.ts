import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  evaluateWorkingFileWriteGate,
  mayAutoRestoreWorkingFileFromStorage,
} from "@/lib/working-file-safety";

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

describe("working-file-safety", () => {
  let href = "http://localhost/";

  beforeEach(() => {
    href = "http://localhost/";
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        get location() {
          return new URL(href);
        },
        history: {
          state: {},
          replaceState: (_s: unknown, _t: string, url?: string | URL | null) => {
            if (url != null) href = new URL(String(url), href).toString();
          },
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "sessionStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("allows write with missing URL but signals rebind", () => {
    const gate = evaluateWorkingFileWriteGate({
      attached: true,
      isWriterLeader: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(gate.ok).toBe(true);
    expect(gate.shouldRebindUrl).toBe(true);
  });

  it("allows write when URL matches", () => {
    href = "http://localhost/?filename=a.storm.json&wf=wf-1";
    const gate = evaluateWorkingFileWriteGate({
      attached: true,
      isWriterLeader: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(gate.ok).toBe(true);
    expect(gate.shouldRebindUrl).toBeFalsy();
  });

  it("blocks write on wf mismatch", () => {
    href = "http://localhost/?filename=a.storm.json&wf=other";
    const gate = evaluateWorkingFileWriteGate({
      attached: true,
      isWriterLeader: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe("url_context_mismatch");
  });

  it("blocks non-writer tabs", () => {
    href = "http://localhost/?filename=a.storm.json&wf=wf-1";
    expect(
      evaluateWorkingFileWriteGate({
        attached: true,
        isWriterLeader: false,
        activeWf: "wf-1",
        label: "a.storm.json",
      }).reason,
    ).toBe("not_writer");
  });

  it("mayAutoRestore requires URL or session — not bare localStorage", () => {
    expect(mayAutoRestoreWorkingFileFromStorage()).toBe(false);
    href = "http://localhost/?filename=a.storm.json";
    expect(mayAutoRestoreWorkingFileFromStorage()).toBe(true);
  });
});
