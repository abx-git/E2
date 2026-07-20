import type { ElementType } from "@/types/storm-element";

export interface ElementStyle {
  label: string;
  shortLabel: string;
  bg: string;
  border: string;
  text: string;
  defaultWidth: number;
  defaultHeight: number;
  shape: "rounded" | "rectangle" | "pill" | "wide";
  rotation?: number;
}

export const ELEMENT_STYLES: Record<ElementType, ElementStyle> = {
  domainEvent: {
    label: "Domain Event",
    shortLabel: "Event",
    bg: "bg-orange-400",
    border: "border-orange-500",
    text: "text-orange-950",
    defaultWidth: 160,
    defaultHeight: 72,
    shape: "rounded",
  },
  command: {
    label: "Command",
    shortLabel: "Cmd",
    bg: "bg-blue-400",
    border: "border-blue-600",
    text: "text-blue-950",
    defaultWidth: 150,
    defaultHeight: 68,
    shape: "rounded",
  },
  actor: {
    label: "Actor",
    shortLabel: "Actor",
    bg: "bg-yellow-300",
    border: "border-yellow-500",
    text: "text-yellow-950",
    defaultWidth: 110,
    defaultHeight: 48,
    shape: "pill",
  },
  aggregate: {
    label: "Aggregate",
    shortLabel: "Agg",
    bg: "bg-yellow-200",
    border: "border-yellow-600 border-2",
    text: "text-yellow-950",
    defaultWidth: 140,
    defaultHeight: 80,
    shape: "rectangle",
  },
  policy: {
    label: "Policy",
    shortLabel: "Policy",
    bg: "bg-purple-400",
    border: "border-purple-600",
    text: "text-purple-950",
    defaultWidth: 170,
    defaultHeight: 72,
    shape: "rounded",
  },
  readModel: {
    label: "Read Model",
    shortLabel: "Read",
    bg: "bg-green-400",
    border: "border-green-600",
    text: "text-green-950",
    defaultWidth: 150,
    defaultHeight: 68,
    shape: "rounded",
  },
  externalSystem: {
    label: "External System",
    shortLabel: "Ext",
    bg: "bg-pink-300",
    border: "border-pink-500 border-2",
    text: "text-pink-950",
    defaultWidth: 160,
    defaultHeight: 72,
    shape: "rectangle",
  },
  ui: {
    label: "UI",
    shortLabel: "UI",
    bg: "bg-white",
    border: "border-slate-400",
    text: "text-slate-800",
    defaultWidth: 130,
    defaultHeight: 60,
    shape: "rounded",
  },
  hotspot: {
    label: "Hotspot",
    shortLabel: "Hot",
    bg: "bg-red-500",
    border: "border-red-700",
    text: "text-white",
    defaultWidth: 120,
    defaultHeight: 120,
    shape: "rectangle",
    rotation: 45,
  },
  pivotalEvent: {
    label: "Pivotal Event",
    shortLabel: "Pivotal",
    bg: "bg-yellow-400",
    border: "border-yellow-600 border-2",
    text: "text-yellow-950",
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
