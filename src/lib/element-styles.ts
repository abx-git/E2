import type { ElementType } from "@/types/storm-element";

export interface ElementStyle {
  label: string;
  shortLabel: string;
  bg: string;
  border: string;
  text: string;
  /** Pastel hex for inline styles (palette / canvas). */
  fill: string;
  stroke: string;
  ink: string;
  defaultWidth: number;
  defaultHeight: number;
  shape: "rounded" | "rectangle" | "pill" | "wide";
  rotation?: number;
}

/** Soft post-it pastels — shared by palette buttons and canvas stickies. */
export const ELEMENT_STYLES: Record<ElementType, ElementStyle> = {
  domainEvent: {
    label: "Domain Event",
    shortLabel: "Event",
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-950",
    fill: "#ffedd5",
    stroke: "#fdba74",
    ink: "#7c2d12",
    defaultWidth: 160,
    defaultHeight: 72,
    shape: "rounded",
  },
  command: {
    label: "Command",
    shortLabel: "Cmd",
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-950",
    fill: "#dbeafe",
    stroke: "#93c5fd",
    ink: "#1e3a8a",
    defaultWidth: 150,
    defaultHeight: 68,
    shape: "rounded",
  },
  actor: {
    label: "Actor",
    shortLabel: "Actor",
    bg: "bg-yellow-100",
    border: "border-yellow-300",
    text: "text-yellow-950",
    fill: "#fef9c3",
    stroke: "#fcd34d",
    ink: "#713f12",
    defaultWidth: 110,
    defaultHeight: 48,
    shape: "pill",
  },
  aggregate: {
    label: "Aggregate",
    shortLabel: "Agg",
    bg: "bg-yellow-100",
    border: "border-yellow-400",
    text: "text-yellow-950",
    fill: "#fef08a",
    stroke: "#facc15",
    ink: "#713f12",
    defaultWidth: 140,
    defaultHeight: 80,
    shape: "rectangle",
  },
  policy: {
    label: "Policy",
    shortLabel: "Policy",
    bg: "bg-fuchsia-100",
    border: "border-fuchsia-300",
    text: "text-fuchsia-950",
    fill: "#fae8ff",
    stroke: "#e879f9",
    ink: "#6b21a8",
    defaultWidth: 170,
    defaultHeight: 72,
    shape: "rounded",
  },
  readModel: {
    label: "Read Model",
    shortLabel: "Read",
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-950",
    fill: "#dcfce7",
    stroke: "#86efac",
    ink: "#064e3b",
    defaultWidth: 150,
    defaultHeight: 68,
    shape: "rounded",
  },
  externalSystem: {
    label: "External System",
    shortLabel: "Ext",
    bg: "bg-pink-100",
    border: "border-pink-300",
    text: "text-pink-950",
    fill: "#fce7f3",
    stroke: "#f9a8d4",
    ink: "#9d174d",
    defaultWidth: 160,
    defaultHeight: 72,
    shape: "rectangle",
  },
  ui: {
    label: "UI",
    shortLabel: "UI",
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-800",
    fill: "#f1f5f9",
    stroke: "#cbd5e1",
    ink: "#0f172a",
    defaultWidth: 130,
    defaultHeight: 60,
    shape: "rounded",
  },
  hotspot: {
    label: "Hotspot",
    shortLabel: "Hot",
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-950",
    fill: "#fee2e2",
    stroke: "#fca5a5",
    ink: "#7f1d1d",
    defaultWidth: 120,
    defaultHeight: 120,
    shape: "rectangle",
    rotation: 45,
  },
  pivotalEvent: {
    label: "Pivotal Event",
    shortLabel: "Pivotal",
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-950",
    fill: "#fef3c7",
    stroke: "#fcd34d",
    ink: "#7c2d12",
    defaultWidth: 280,
    defaultHeight: 48,
    shape: "wide",
  },
};

export function elementDimensions(type: ElementType): { width: number; height: number } {
  const s = ELEMENT_STYLES[type];
  return { width: s.defaultWidth, height: s.defaultHeight };
}

export function defaultLabelForType(type: ElementType): string {
  return ELEMENT_STYLES[type].label;
}
