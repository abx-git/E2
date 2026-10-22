import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  readElementsPanelOpen,
  readPropertiesPanelOpen,
  writeElementsPanelOpen,
  writePropertiesPanelOpen,
} from "@/lib/board-layout-prefs";

describe("board layout prefs", () => {
  const backing = new Map<string, string>();

  beforeEach(() => {
    backing.clear();
    const storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value);
      },
      removeItem: (key: string) => {
        backing.delete(key);
      },
      clear: () => backing.clear(),
    };
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  it("defaults panels to open", () => {
    expect(readElementsPanelOpen()).toBe(true);
    expect(readPropertiesPanelOpen()).toBe(true);
  });

  it("persists closed state in sessionStorage", () => {
    writeElementsPanelOpen(false);
    writePropertiesPanelOpen(false);
    expect(readElementsPanelOpen()).toBe(false);
    expect(readPropertiesPanelOpen()).toBe(false);
  });
});
