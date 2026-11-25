import { elementStyleCanPaste } from "@/lib/element-style-clipboard";
import type { useStormBoardStore } from "@/store/storm-board-store";
import type { TranslateFn } from "@/i18n/translate";

type StormStore = ReturnType<typeof useStormBoardStore.getState>;

function getStormBoardStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/store/storm-board-store") as typeof import("@/store/storm-board-store");
  return mod.useStormBoardStore;
}

export type ElementStylePasteOutcome =
  | { status: "applied" }
  | { status: "error"; reason: "no_clipboard" | "no_target" | "same_element" | "incompatible" };

export function runElementStyleCopy(elementId: string): boolean {
  return getStormBoardStore().getState().copyElementStyle(elementId);
}

export function elementStylePasteEnabled(elementId: string): boolean {
  const s = getStormBoardStore().getState() as StormStore;
  const target = s.elements.find((e) => e.id === elementId);
  if (!target) return false;
  return elementStyleCanPaste(
    target.type,
    elementId,
    s.elementStyleClipboard,
    s.elementStyleClipboardSourceId,
  );
}

export function runElementStylePaste(
  _t: TranslateFn,
  targetId: string,
): ElementStylePasteOutcome {
  const store = getStormBoardStore().getState() as StormStore;
  if (!store.elementStyleClipboard) {
    return { status: "error", reason: "no_clipboard" };
  }
  if (store.elementStyleClipboardSourceId === targetId) {
    return { status: "error", reason: "same_element" };
  }
  const plan = store.getElementStylePastePlan(targetId);
  if (!plan) {
    return { status: "error", reason: "incompatible" };
  }
  store.applyElementStylePaste(targetId, plan);
  return { status: "applied" };
}