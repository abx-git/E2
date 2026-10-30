/** Markdown helpers for element descriptions (Bemerkung). */

/** Undo LLM/E2V wire escapes: literal `\n` in text → real line breaks; `↵` markers from E2V export. */
export function unescapeE2vMultilineText(raw: string): string {
  return raw
    .replace(/\s*↵\s*/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");
}

/** Encode line breaks for a single E2V cell (avoids JSON `\n` sequences in AI copy/paste). */
export function encodeE2vMultilineText(raw: string): string {
  return unescapeE2vMultilineText(raw).replace(/\n/g, " ↵ ");
}

export function normalizeDescriptionMarkdown(raw: string): string {
  return unescapeE2vMultilineText(raw.replace(/\r\n/g, "\n"));
}

/**
 * Flatten markdown to readable plain text for PNG/SVG/Draw.io wrapping.
 * Keeps paragraph breaks; strips common markup.
 */
export function markdownToPlainText(raw: string): string {
  const text = normalizeDescriptionMarkdown(raw)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}
