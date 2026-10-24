import { describe, expect, it } from "vitest";

import { isTypingTarget, shouldSuppressBoardDeleteKey } from "@/lib/keyboard-input-guard";

function keyEvent(key: string): KeyboardEvent {
  return { key } as KeyboardEvent;
}

describe("keyboard-input-guard", () => {
  it("detects textarea targets", () => {
    const textarea = { tagName: "TEXTAREA", closest: () => null } as HTMLElement;
    expect(isTypingTarget(textarea)).toBe(true);
  });

  it("detects nested contenteditable via closest", () => {
    const span = {
      tagName: "SPAN",
      isContentEditable: false,
      closest: (sel: string) => (sel.includes("contenteditable") ? {} : null),
    } as HTMLElement;
    expect(isTypingTarget(span)).toBe(true);
  });

  it("suppresses delete when editing element id is set", () => {
    expect(shouldSuppressBoardDeleteKey(keyEvent("Backspace"), { editingElementId: "el-1" })).toBe(
      true,
    );
    expect(shouldSuppressBoardDeleteKey(keyEvent("a"))).toBe(false);
  });
});
