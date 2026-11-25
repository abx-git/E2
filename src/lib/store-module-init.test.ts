import { describe, expect, it } from "vitest";

/**
 * Regression: circular imports between storm-board-store and clipboard UI
 * caused "Cannot access '…' before initialization" on static export / standalone.
 */
describe("storm-board-store module graph", () => {
  it("loads store and clipboard UI without TDZ", async () => {
    const storeMod = await import("@/store/storm-board-store");
    const styleUi = await import("@/lib/element-style-clipboard-ui");
    const attrUi = await import("@/lib/element-attribute-clipboard-ui");
    expect(storeMod.useStormBoardStore).toBeTypeOf("function");
    expect(styleUi.runElementStyleCopy).toBeTypeOf("function");
    expect(attrUi.runElementAttributeCopy).toBeTypeOf("function");
  });
});