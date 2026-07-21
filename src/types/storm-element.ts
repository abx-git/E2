export type ModelingMode = "eventStorming" | "domainDrivenDesign";

export type ElementType =
  | "domainEvent"
  | "command"
  | "actor"
  | "aggregate"
  | "policy"
  | "readModel"
  | "externalSystem"
  | "ui"
  | "note"
  | "hotspot"
  | "pivotalEvent"
  | "entity"
  | "valueObject"
  | "domainService"
  | "repository"
  | "factory"
  | "subdomain";

export type HotspotStatus = "open" | "resolved";
export type HotspotPriority = "low" | "medium" | "high";
export type SubdomainKind = "core" | "supporting" | "generic";

export type NoteColorId =
  | "cream"
  | "yellow"
  | "mint"
  | "sky"
  | "lavender"
  | "rose"
  | "peach"
  | "slate";

export interface ElementMetadata {
  eventSchema?: Record<string, unknown>;
  aggregateMethods?: string[];
  aggregateInvariants?: string[];
  isRecurring?: boolean;
  hotspotStatus?: HotspotStatus;
  hotspotPriority?: HotspotPriority;
  /** Background preset for `note` elements. */
  noteColor?: NoteColorId;
  /** Strategic DDD: Core / Supporting / Generic. */
  subdomainKind?: SubdomainKind;
}

export interface StormElement {
  id: string;
  type: ElementType;
  label: string;
  description?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  swimlaneId?: string;
  boundedContextId?: string;
  metadata?: ElementMetadata;
}

/** Workshop recipe within the active modeling mode. */
export type WorkshopFormat =
  | "free"
  | "bigPicture"
  | "processModeling"
  | "softwareDesign"
  | "strategicDesign"
  | "tacticalDesign";

export interface Swimlane {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface BoundedContext {
  id: string;
  label: string;
  purpose?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface Timeline {
  y: number;
  startLabel?: string;
  endLabel?: string;
  /** When false, the guide is hidden (snap still uses y if snapToTimeline is on). Default true. */
  visible?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface FacilitatorState {
  enabled: boolean;
  format: WorkshopFormat;
  phaseIndex: number;
}

export const DEFAULT_TIMELINE: Timeline = {
  y: 400,
  startLabel: "Start",
  endLabel: "Ende",
  visible: true,
};
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
export const DEFAULT_MODELING_MODE: ModelingMode = "eventStorming";

/** Shared across Event Storming and DDD palettes. */
export const SHARED_ELEMENT_TYPES: ElementType[] = [
  "note",
  "hotspot",
  "aggregate",
  "domainEvent",
  "externalSystem",
];

/** Palette order for Event Storming mode (facilitator off / free). */
export const ES_ELEMENT_TYPES: ElementType[] = [
  "domainEvent",
  "command",
  "actor",
  "aggregate",
  "policy",
  "readModel",
  "externalSystem",
  "ui",
  "note",
  "hotspot",
  "pivotalEvent",
];

/** Palette order for Domain-Driven Design mode (facilitator off / free). */
export const DDD_ELEMENT_TYPES: ElementType[] = [
  "subdomain",
  "entity",
  "valueObject",
  "aggregate",
  "domainService",
  "repository",
  "factory",
  "domainEvent",
  "externalSystem",
  "note",
  "hotspot",
];

/** All sticky types that can appear on a board (both methods). */
export const ALL_ELEMENT_TYPES: ElementType[] = [
  ...ES_ELEMENT_TYPES,
  "entity",
  "valueObject",
  "domainService",
  "repository",
  "factory",
  "subdomain",
];

export const ES_WORKSHOP_FORMATS: WorkshopFormat[] = [
  "free",
  "bigPicture",
  "processModeling",
  "softwareDesign",
];

export const DDD_WORKSHOP_FORMATS: WorkshopFormat[] = [
  "free",
  "strategicDesign",
  "tacticalDesign",
];

export const MODELING_MODE_LABELS: Record<ModelingMode, string> = {
  eventStorming: "Event Storming",
  domainDrivenDesign: "Domain-Driven Design",
};

export function elementTypesForMode(mode: ModelingMode): ElementType[] {
  return mode === "domainDrivenDesign" ? DDD_ELEMENT_TYPES : ES_ELEMENT_TYPES;
}

export function workshopFormatsForMode(mode: ModelingMode): WorkshopFormat[] {
  return mode === "domainDrivenDesign" ? DDD_WORKSHOP_FORMATS : ES_WORKSHOP_FORMATS;
}

export function isWorkshopFormatForMode(format: WorkshopFormat, mode: ModelingMode): boolean {
  return workshopFormatsForMode(mode).includes(format);
}

export function defaultPaletteTypeForMode(mode: ModelingMode): ElementType {
  return mode === "domainDrivenDesign" ? "entity" : "domainEvent";
}

export function normalizeModelingMode(value: unknown): ModelingMode {
  return value === "domainDrivenDesign" ? "domainDrivenDesign" : "eventStorming";
}
