import { elementStyleCanPaste } from "@/lib/element-style-clipboard";
import type { TranslateFn } from "@/i18n/translate";
import { getStormBoardState, getUseStormBoardStore } from "@/lib/storm-board-store-runtime";

export type ElementStylePasteOutcome =
  | { status: "applied" }
  | { status: "error"; reason: "no_clipboard" | "no_target" | "same_element" | "incompatible" };

export function runElementStyleCopy(elementId: string): boolean {
  return getUseStormBoardStore().getState().copyElementStyle(elementId);
}

export function elementStylePasteEnabled(elementId: string): boolean {
  const s = getStormBoardState();
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
  const store = getStormBoardState();
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