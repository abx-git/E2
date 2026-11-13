import { BOUNDARY_FILL_OPACITY } from "@/lib/board-export-visual";
import type { ElementStyle } from "@/lib/element-styles";
import { clampOpacity, hexToRgba, parseHexColor } from "@/lib/region-style";
import type { ElementMetadata, ElementType, StormElement } from "@/types/storm-element";
import { isStackingContainerType } from "@/lib/element-z-order";
import type { NoteColorStyle } from "@/lib/note-colors";

export const CARD_APPEARANCE_METADATA_KEYS: (keyof ElementMetadata)[] = [
  "cardFillColor",
  "cardFillOpacity",
  "cardBorderColor",
  "cardBorderOpacity",
];

export type CardAppearancePatch = Partial<{
  cardFillColor: string | undefined;
  cardFillOpacity: number | undefined;
  cardBorderColor: string | undefined;
  cardBorderOpacity: number | undefined;
}>;

export interface ResolvedCardPaint {
  fillHex: string;
  fillOpacity: number;
  borderHex: string;
  borderOpacity: number;
  backgroundColor: string;
  borderColor: string;
  ink: string;
  hasCustomAppearance: boolean;
}

function defaultFillOpacity(type: ElementType): number {
  return isStackingContainerType(type) ? BOUNDARY_FILL_OPACITY : 1;
}

export function pickCardAppearanceMetadata(
  meta: ElementMetadata | undefined,
): ElementMetadata | undefined {
  if (!meta) return undefined;
  const out: ElementMetadata = {};
  for (const key of CARD_APPEARANCE_METADATA_KEYS) {
    if (meta[key] !== undefined && meta[key] !== null) {
      (out as Record<string, unknown>)[key] = meta[key];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function resolveCardPaint(
  element: Pick<StormElement, "type" | "metadata">,
  style: ElementStyle,
  noteColors: NoteColorStyle | null,
): ResolvedCardPaint {
  const meta = element.metadata;
  const baseFill = noteColors?.fill ?? style.fill;
  const baseStroke = noteColors?.stroke ?? style.stroke;
  const baseInk = noteColors?.ink ?? style.ink;

  const fillHex = parseHexColor(meta?.cardFillColor) ?? parseHexColor(baseFill) ?? baseFill;
  const borderHex = parseHexColor(meta?.cardBorderColor) ?? parseHexColor(baseStroke) ?? baseStroke;
  const fillOpacity = clampOpacity(
    meta?.cardFillOpacity,
    meta?.cardFillOpacity === undefined ? defaultFillOpacity(element.type) : 1,
  );
  const borderOpacity = clampOpacity(meta?.cardBorderOpacity, 1);

  const hasCustomAppearance = CARD_APPEARANCE_METADATA_KEYS.some(
    (key) => meta?.[key] !== undefined && meta?.[key] !== null,
  );

  return {
    fillHex,
    fillOpacity,
    borderHex,
    borderOpacity,
    backgroundColor: hexToRgba(fillHex, fillOpacity),
    borderColor: hexToRgba(borderHex, borderOpacity),
    ink: baseInk,
    hasCustomAppearance,
  };
}

export function cardAppearanceFromMetadata(
  meta: ElementMetadata | undefined,
): CardAppearancePatch {
  return {
    cardFillColor: meta?.cardFillColor,
    cardFillOpacity: meta?.cardFillOpacity,
    cardBorderColor: meta?.cardBorderColor,
    cardBorderOpacity: meta?.cardBorderOpacity,
  };
}

export function mergeCardAppearancePatch(
  meta: ElementMetadata | undefined,
  patch: CardAppearancePatch,
): ElementMetadata {
  const next: ElementMetadata = { ...(meta ?? {}) };
  for (const [key, value] of Object.entries(patch) as [
    keyof CardAppearancePatch,
    string | number | undefined,
  ][]) {
    if (value === undefined) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}
