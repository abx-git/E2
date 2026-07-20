export type ElementType =
  | "domainEvent"
  | "command"
  | "actor"
  | "aggregate"
  | "policy"
  | "readModel"
  | "externalSystem"
  | "ui"
  | "hotspot"
  | "pivotalEvent";

export type HotspotStatus = "open" | "resolved";
export type HotspotPriority = "low" | "medium" | "high";

export interface ElementMetadata {
  eventSchema?: Record<string, unknown>;
  aggregateMethods?: string[];
  aggregateInvariants?: string[];
  isRecurring?: boolean;
  hotspotStatus?: HotspotStatus;
  hotspotPriority?: HotspotPriority;
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

export type WorkshopFormat = "bigPicture" | "processModeling" | "softwareDesign" | "free";

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

export const DEFAULT_TIMELINE: Timeline = { y: 400, startLabel: "Start", endLabel: "Ende" };
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const ALL_ELEMENT_TYPES: ElementType[] = [
  "domainEvent",
  "command",
  "actor",
  "aggregate",
  "policy",
  "readModel",
  "externalSystem",
  "ui",
  "hotspot",
  "pivotalEvent",
];
