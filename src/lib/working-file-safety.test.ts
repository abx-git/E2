import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  confirmMissingUrlContextWrite,
  evaluateWorkingFileUrlContext,
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
        confirm: () => true,
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "sessionStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("blocks write when URL has neither filename nor wf", () => {
    const gate = evaluateWorkingFileUrlContext({
      attached: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe("url_context_missing");
  });

  it("allows write when URL filename matches label", () => {
    href = "http://localhost/?filename=a.storm.json&wf=wf-1";
    const gate = evaluateWorkingFileUrlContext({
      attached: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(gate.ok).toBe(true);
  });

  it("blocks write on wf mismatch", () => {
    href = "http://localhost/?filename=a.storm.json&wf=other";
    const gate = evaluateWorkingFileUrlContext({
      attached: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe("url_context_mismatch");
  });

  it("blocks write on filename mismatch", () => {
    href = "http://localhost/?filename=a.storm.json&wf=wf-1";
    const gate = evaluateWorkingFileUrlContext({
      attached: true,
      activeWf: "wf-1",
      label: "b.storm.json",
    });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe("url_context_mismatch");
  });

  it("write gate requires leader unless opted out", () => {
    href = "http://localhost/?filename=a.storm.json&wf=wf-1";
    expect(
      evaluateWorkingFileWriteGate({
        attached: true,
        isWriterLeader: false,
        activeWf: "wf-1",
        label: "a.storm.json",
      }).reason,
    ).toBe("not_writer");

    expect(
      evaluateWorkingFileWriteGate({
        attached: true,
        isWriterLeader: false,
        activeWf: "wf-1",
        label: "a.storm.json",
        requireWriter: false,
      }).ok,
    ).toBe(true);
  });

  it("allows missing URL only after userConfirmed", () => {
    const blocked = evaluateWorkingFileWriteGate({
      attached: true,
      isWriterLeader: true,
      activeWf: "wf-1",
      label: "a.storm.json",
    });
    expect(blocked.reason).toBe("url_context_missing");

    const allowed = evaluateWorkingFileWriteGate({
      attached: true,
      isWriterLeader: true,
      activeWf: "wf-1",
      label: "a.storm.json",
      userConfirmed: true,
    });
    expect(allowed.ok).toBe(true);
  });

  it("mayAutoRestore requires URL or session — not bare localStorage", () => {
    expect(mayAutoRestoreWorkingFileFromStorage()).toBe(false);
    href = "http://localhost/?filename=a.storm.json";
    expect(mayAutoRestoreWorkingFileFromStorage()).toBe(true);
  });

  it("confirmMissingUrlContextWrite uses window.confirm", () => {
    expect(confirmMissingUrlContextWrite("demo.storm.json")).toBe(true);
  });
});
