/**
 * User-defined card types for freeform mode (UML-style stereotypes).
 * Types live on the active view and drive palette + card colors.
 */

import { generateStormId } from "@/lib/storm-id";
import { NOTE_COLORS, type NoteColorStyle } from "@/lib/note-colors";

export interface CustomCardType {
  id: string;
  /** Stereotype / type name without « » — e.g. "Interface" */
  name: string;
  fill: string;
  stroke: string;
  ink: string;
}

/** Preset swatches for practical color picking (same pastels as notes). */
export const CUSTOM_CARD_COLOR_PRESETS: NoteColorStyle[] = Object.values(NOTE_COLORS);

export const DEFAULT_CUSTOM_CARD_COLORS: Pick<CustomCardType, "fill" | "stroke" | "ink"> = {
  fill: NOTE_COLORS.slate.fill,
  stroke: NOTE_COLORS.slate.stroke,
  ink: NOTE_COLORS.slate.ink,
};

/** Starter catalogue when entering freeform with an empty type list. */
export function createDefaultCustomCardTypes(): CustomCardType[] {
  return [
    {
      id: generateStormId(),
      name: "Concept",
      fill: NOTE_COLORS.slate.fill,
      stroke: NOTE_COLORS.slate.stroke,
      ink: NOTE_COLORS.slate.ink,
    },
    {
      id: generateStormId(),
      name: "Interface",
      fill: NOTE_COLORS.sky.fill,
      stroke: NOTE_COLORS.sky.stroke,
      ink: NOTE_COLORS.sky.ink,
    },
    {
      id: generateStormId(),
      name: "Class",
      fill: NOTE_COLORS.lavender.fill,
      stroke: NOTE_COLORS.lavender.stroke,
      ink: NOTE_COLORS.lavender.ink,
    },
  ];
}

export function stereotypeLabel(name: string): string {
  const trimmed = name.trim() || "Typ";
  return `«${trimmed}»`;
}

export function normalizeCustomCardType(raw: unknown): CustomCardType | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : generateStormId();
  const name =
    typeof o.name === "string" && o.name.trim()
      ? o.name.trim().slice(0, 64)
      : "Typ";
  const fill =
    typeof o.fill === "string" && /^#[0-9a-fA-F]{3,8}$/.test(o.fill)
      ? o.fill
      : DEFAULT_CUSTOM_CARD_COLORS.fill;
  const stroke =
    typeof o.stroke === "string" && /^#[0-9a-fA-F]{3,8}$/.test(o.stroke)
      ? o.stroke
      : DEFAULT_CUSTOM_CARD_COLORS.stroke;
  const ink =
    typeof o.ink === "string" && /^#[0-9a-fA-F]{3,8}$/.test(o.ink)
      ? o.ink
      : DEFAULT_CUSTOM_CARD_COLORS.ink;
  return { id, name, fill, stroke, ink };
}

export function normalizeCustomCardTypes(raw: unknown): CustomCardType[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomCardType[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const t = normalizeCustomCardType(entry);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

export function findCustomCardType(
  types: CustomCardType[],
  id: string | undefined | null,
): CustomCardType | null {
  if (!id) return null;
  return types.find((t) => t.id === id) ?? null;
}

export function colorsFromPreset(preset: NoteColorStyle): Pick<CustomCardType, "fill" | "stroke" | "ink"> {
  return { fill: preset.fill, stroke: preset.stroke, ink: preset.ink };
}
