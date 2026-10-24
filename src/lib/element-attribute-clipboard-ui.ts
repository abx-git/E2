import {
  attributePasteNeedsConfirmation,
  type AttributePasteWarning,
} from "@/lib/element-attribute-clipboard";
import { elementTypeLabel } from "@/i18n";
import type { TranslateFn } from "@/i18n/translate";
import { useStormBoardStore } from "@/store/storm-board-store";

export type ElementAttributePasteOutcome =
  | { status: "applied" }
  | { status: "cancelled" }
  | { status: "error"; reason: "no_clipboard" | "no_target" | "same_element" };

export function runElementAttributePaste(
  t: TranslateFn,
  targetId: string,
): ElementAttributePasteOutcome {
  const store = useStormBoardStore.getState();
  if (!store.elementAttributeClipboard) {
    return { status: "error", reason: "no_clipboard" };
  }
  if (store.elementAttributeClipboardSourceId === targetId) {
    return { status: "error", reason: "same_element" };
  }
  const plan = store.getElementAttributePastePlan(targetId);
  if (!plan) {
    return { status: "error", reason: "no_target" };
  }
  if (attributePasteNeedsConfirmation(plan.warnings)) {
    const ok = window.confirm(attributePasteConfirmMessage(t, plan.warnings));
    if (!ok) return { status: "cancelled" };
  }
  store.applyElementAttributePaste(targetId, plan);
  return { status: "applied" };
}

export function runElementAttributeCopy(elementId: string): boolean {
  return useStormBoardStore.getState().copyElementAttributes(elementId);
}

export function attributePasteConfirmMessage(
  t: TranslateFn,
  warnings: AttributePasteWarning[],
): string {
  if (warnings.length === 0) return "";

  const lines: string[] = [t("dialogs.elementAttributePaste.intro")];

  const targetLost: string[] = [];
  const sourceDropped: string[] = [];

  for (const w of warnings) {
    switch (w.kind) {
      case "typeChange":
        lines.push(
          t("dialogs.elementAttributePaste.typeChange", {
            from: elementTypeLabel(t, w.from),
            to: elementTypeLabel(t, w.to),
          }),
        );
        break;
      case "labelOverwrite":
        lines.push(t("dialogs.elementAttributePaste.labelOverwrite"));
        break;
      case "descriptionOverwrite":
        lines.push(t("dialogs.elementAttributePaste.descriptionOverwrite"));
        break;
      case "targetMetadataLost":
        targetLost.push(w.key);
        break;
      case "sourceMetadataDropped":
        sourceDropped.push(w.key);
        break;
      default:
        break;
    }
  }

  if (targetLost.length) {
    lines.push(
      t("dialogs.elementAttributePaste.targetLost", { fields: targetLost.join(", ") }),
    );
  }
  if (sourceDropped.length) {
    lines.push(
      t("dialogs.elementAttributePaste.sourceDropped", { fields: sourceDropped.join(", ") }),
    );
  }

  lines.push("", t("dialogs.elementAttributePaste.proceed"));
  return lines.join("\n");
}
