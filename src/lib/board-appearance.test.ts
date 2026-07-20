import { describe, expect, it } from "vitest";

import {
  appearanceToCssVars,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
} from "@/lib/board-appearance";

describe("board-appearance", () => {
  it("normalizes missing or invalid colors to defaults", () => {
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ canvas: "red", sidebar: "#ffffff" }).canvas).toBe(
      DEFAULT_APPEARANCE.canvas,
    );
  });

  it("derives CSS vars for dark and light sidebars", () => {
    const dark = appearanceToCssVars(DEFAULT_APPEARANCE);
    expect(dark["--canvas"]).toBe(DEFAULT_APPEARANCE.canvas);
    expect(dark["--panel-solid"]).toBe(DEFAULT_APPEARANCE.sidebar);
    expect(dark["color-scheme"]).toBe("dark");

    const light = appearanceToCssVars({ canvas: "#f3efe6", sidebar: "#f4f6f8" });
    expect(light["color-scheme"]).toBe("light");
    expect(light["--text"]).toBe("#1a2330");
  });
});
