import type { BoardConnector } from "@/types/board-connector";

/** Initial value for editing a connector caption as free text. */
export function connectorFreeTextPromptDefault(c: BoardConnector): string {
  if (c.labelMode === "type") return c.label?.trim() ?? "";
  return c.label ?? "";
}

export function connectorFreeTextLabelPatch(
  next: string,
): Pick<BoardConnector, "label" | "labelMode"> {
  return { label: next, labelMode: "custom" };
}
