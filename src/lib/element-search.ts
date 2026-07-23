import {
  cardAttributeLines,
  cardMethodLines,
} from "@/lib/card-preview";
import type { StormElement } from "@/types/storm-element";

export interface ElementSearchHit {
  match: boolean;
  inLabel: boolean;
  inDescription: boolean;
  inAttributes: boolean;
  inMethods: boolean;
  /** Match outside the title — emphasize the card. */
  emphasizeCard: boolean;
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function textIncludes(haystack: string | undefined | null, needle: string): boolean {
  if (!needle || !haystack) return false;
  return haystack.toLowerCase().includes(needle);
}

function anyLineIncludes(lines: string[], needle: string): boolean {
  return lines.some((line) => textIncludes(line, needle));
}

/** Case-insensitive match against label, description, attributes, and methods. */
export function matchElementSearch(
  element: StormElement,
  query: string,
  opts?: { viewNameById?: Record<string, string> },
): ElementSearchHit {
  const needle = normalizeSearchQuery(query);
  if (!needle) {
    return {
      match: false,
      inLabel: false,
      inDescription: false,
      inAttributes: false,
      inMethods: false,
      emphasizeCard: false,
    };
  }

  const inLabel = textIncludes(element.label, needle);
  const inDescription = textIncludes(element.description, needle);
  const inAttributes = anyLineIncludes(
    cardAttributeLines(element, { viewNameById: opts?.viewNameById }),
    needle,
  );
  const inMethods = anyLineIncludes(cardMethodLines(element), needle);
  const match = inLabel || inDescription || inAttributes || inMethods;

  return {
    match,
    inLabel,
    inDescription,
    inAttributes,
    inMethods,
    emphasizeCard: match && (inDescription || inAttributes || inMethods),
  };
}

/** Split `text` into parts for case-insensitive highlighting of `query`. */
export function splitHighlight(text: string, query: string): HighlightPart[] {
  const needle = normalizeSearchQuery(query);
  if (!needle || !text) return [{ text, hit: false }];

  const lower = text.toLowerCase();
  const parts: HighlightPart[] = [];
  let start = 0;

  while (start < text.length) {
    const idx = lower.indexOf(needle, start);
    if (idx === -1) {
      parts.push({ text: text.slice(start), hit: false });
      break;
    }
    if (idx > start) {
      parts.push({ text: text.slice(start, idx), hit: false });
    }
    parts.push({ text: text.slice(idx, idx + needle.length), hit: true });
    start = idx + needle.length;
  }

  return parts.length > 0 ? parts : [{ text, hit: false }];
}
