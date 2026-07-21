import type { NoteColorId } from "@/types/storm-element";

/** Pastel note background presets (workshop sticky colors). */

export interface NoteColorStyle {
  id: NoteColorId;
  label: string;
  fill: string;
  stroke: string;
  ink: string;
}

export const NOTE_COLORS: Record<NoteColorId, NoteColorStyle> = {
  cream: {
    id: "cream",
    label: "Creme",
    fill: "#faf6ef",
    stroke: "#d6d0c4",
    ink: "#44403c",
  },
  yellow: {
    id: "yellow",
    label: "Gelb",
    fill: "#fef9c3",
    stroke: "#fcd34d",
    ink: "#713f12",
  },
  mint: {
    id: "mint",
    label: "Mint",
    fill: "#dcfce7",
    stroke: "#86efac",
    ink: "#14532d",
  },
  sky: {
    id: "sky",
    label: "Himmel",
    fill: "#e0f2fe",
    stroke: "#7dd3fc",
    ink: "#0c4a6e",
  },
  lavender: {
    id: "lavender",
    label: "Lavendel",
    fill: "#f3e8ff",
    stroke: "#d8b4fe",
    ink: "#581c87",
  },
  rose: {
    id: "rose",
    label: "Rosa",
    fill: "#ffe4e6",
    stroke: "#fda4af",
    ink: "#881337",
  },
  peach: {
    id: "peach",
    label: "Pfirsich",
    fill: "#ffedd5",
    stroke: "#fdba74",
    ink: "#9a3412",
  },
  slate: {
    id: "slate",
    label: "Grau",
    fill: "#f1f5f9",
    stroke: "#cbd5e1",
    ink: "#0f172a",
  },
};

export const NOTE_COLOR_IDS = Object.keys(NOTE_COLORS) as NoteColorId[];

export const DEFAULT_NOTE_COLOR: NoteColorId = "cream";

export function isNoteColorId(value: unknown): value is NoteColorId {
  return typeof value === "string" && value in NOTE_COLORS;
}

export function resolveNoteColor(colorId: unknown): NoteColorStyle {
  if (isNoteColorId(colorId)) return NOTE_COLORS[colorId];
  return NOTE_COLORS[DEFAULT_NOTE_COLOR];
}
