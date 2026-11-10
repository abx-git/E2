import { layoutRegionCanPasteAppearance } from "@/lib/region-appearance-clipboard";
import { runElementAttributePaste } from "@/lib/element-attribute-clipboard-ui";
import type { TranslateFn } from "@/i18n/translate";
import { useStormBoardStore } from "@/store/storm-board-store";

export type RegionAppearanceCopyOutcome = { status: "copied" } | { status: "error" };

export type RegionAppearancePasteOutcome =
  | { status: "applied" }
  | { status: "cancelled" }
  | { status: "error"; reason: "no_clipboard" | "no_target" | "same_element" | "incompatible" };

export function runRegionAppearanceCopy(elementId: string): RegionAppearanceCopyOutcome {
  const ok = useStormBoardStore.getState().copyElementAttributes(elementId);
  return ok ? { status: "copied" } : { status: "error" };
}

export function regionAppearancePasteEnabled(elementId: string, elementType: string): boolean {
  const s = useStormBoardStore.getState();
  return layoutRegionCanPasteAppearance(
    elementType,
    elementId,
    s.elementAttributeClipboard,
    s.elementAttributeClipboardSourceId,
  );
}

export function runRegionAppearancePaste(
  t: TranslateFn,
  targetId: string,
): RegionAppearancePasteOutcome {
  const store = useStormBoardStore.getState();
  const target = store.elements.find((e) => e.id === targetId);
  if (!target) return { status: "error", reason: "no_target" };
  if (!store.elementAttributeClipboard) {
    return { status: "error", reason: "no_clipboard" };
  }
  if (store.elementAttributeClipboardSourceId === targetId) {
    return { status: "error", reason: "same_element" };
  }
  if (!regionAppearancePasteEnabled(targetId, target.type)) {
    return { status: "error", reason: "incompatible" };
  }
  const outcome = runElementAttributePaste(t, targetId);
  if (outcome.status === "applied") return { status: "applied" };
  if (outcome.status === "cancelled") return { status: "cancelled" };
  return { status: "error", reason: outcome.reason ?? "incompatible" };
}
