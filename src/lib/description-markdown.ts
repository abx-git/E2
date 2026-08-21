/** Markdown helpers for element descriptions (Bemerkung). */

export function normalizeDescriptionMarkdown(raw: string): string {
  return raw.replace(/\r\n/g, "\n");
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
