/** True when the user is typing in a field (including nested contenteditable children). */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.closest) return false;

  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;

  if (el.closest("[contenteditable='true'], [contenteditable='']")) return true;
  if (el.closest("[role='textbox']")) return true;
  if (el.closest(".description-mdx-editor, .mdxeditor, [class*='mdxeditor']")) return true;
  if (el.closest("[data-board-inspector]")) return true;
  if (el.closest("[role='dialog']")) return true;

  return false;
}

/** Block canvas Delete/Backspace shortcuts while editing text or inspector/dialog UI. */
export function shouldSuppressBoardDeleteKey(
  e: KeyboardEvent,
  options?: { editingElementId?: string | null },
): boolean {
  if (e.key !== "Delete" && e.key !== "Backspace") return false;
  if (options?.editingElementId) return true;
  if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return true;
  return false;
}
