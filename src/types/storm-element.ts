export type ModelingMode =
  | "eventStorming"
  | "domainDrivenDesign"
  | "bdd"
  | "userStoryMapping"
  | "eventModeling";

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
  | "subdomain"
  /** BDD / Example Mapping */
  | "rule"
  | "example"
  | "question"
  /** User Story Mapping */
  | "activity"
  | "userTask"
  | "userStory"
  | "release"
  /** Event Modeling */
  | "slice";

export type HotspotStatus = "open" | "resolved";
export type HotspotPriority = "low" | "medium" | "high";
export type SubdomainKind = "core" | "supporting" | "generic";
export type StoryPriority = "must" | "should" | "could" | "wont";
export type QuestionStatus = "open" | "resolved";

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

  /** Entity / Value Object / Aggregate: Eigenschaften („name“ oder „name: Typ“). */
  attributes?: string[];
  /** Entity: Identitätsfelder (z. B. „id“, „customerId“). */
  identityFields?: string[];
  /** Entity / Domain Service / Repository / Factory: Operationen / Methoden. */
  operations?: string[];
  /** Value Object: unveränderlich (Standard: true). */
  immutable?: boolean;
  /** Domain Service: ohne eigenen Zustand (Standard: true). */
  stateless?: boolean;
  /** Repository: zugehöriger Aggregate Root (Freitext / Name). */
  aggregateRootRef?: string;
  /** Factory: erzeugter Typ / Aggregate (Freitext / Name). */
  createsRef?: string;

  /** BDD Rule: Akzeptanzkriterien / Hinweise. */
  ruleCriteria?: string[];
  /** BDD Example: Given / When / Then. */
  exampleGiven?: string[];
  exampleWhen?: string[];
  exampleThen?: string[];
  /** BDD Question. */
  questionStatus?: QuestionStatus;

  /** User Story: Persona / Rolle. */
  storyPersona?: string;
  storyPriority?: StoryPriority;
  storyEstimate?: string;
  storyAcceptance?: string[];

  /** Release / Slice: Ziel oder Scope. */
  releaseGoal?: string;
  /** Event-Modeling-Slice: beteiligte Systeme / Lanes. */
  sliceSystems?: string[];

  /** Sticky: Beschreibung auf der Karte anzeigen. */
  showDescriptionOnCard?: boolean;
  /** Sticky: Attribute / Kriterien auf der Karte anzeigen. */
  showAttributesOnCard?: boolean;
  /** Sticky: Methoden / Operationen auf der Karte anzeigen. */
  showMethodsOnCard?: boolean;
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
  | "tacticalDesign"
  | "exampleMapping"
  | "storyMapping"
  | "eventModelingWorkshop";

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

export const MODELING_MODES: ModelingMode[] = [
  "eventStorming",
  "domainDrivenDesign",
  "bdd",
  "userStoryMapping",
  "eventModeling",
];

/** Shared annotation types. */
export const SHARED_ELEMENT_TYPES: ElementType[] = ["note", "hotspot"];

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

/** Palette order for Domain-Driven Design mode. */
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

/** BDD / Example Mapping palette. */
export const BDD_ELEMENT_TYPES: ElementType[] = [
  "rule",
  "example",
  "question",
  "actor",
  "note",
  "hotspot",
];

/** User Story Mapping palette. */
export const USM_ELEMENT_TYPES: ElementType[] = [
  "activity",
  "userTask",
  "userStory",
  "release",
  "actor",
  "note",
  "hotspot",
];

/** Event Modeling palette (reuses ES building blocks + slice). */
export const EM_ELEMENT_TYPES: ElementType[] = [
  "slice",
  "domainEvent",
  "command",
  "readModel",
  "ui",
  "actor",
  "policy",
  "externalSystem",
  "note",
  "hotspot",
];

/** All sticky types that can appear on a board. */
export const ALL_ELEMENT_TYPES: ElementType[] = [
  ...ES_ELEMENT_TYPES,
  "entity",
  "valueObject",
  "domainService",
  "repository",
  "factory",
  "subdomain",
  "rule",
  "example",
  "question",
  "activity",
  "userTask",
  "userStory",
  "release",
  "slice",
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

export const BDD_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "exampleMapping"];

export const USM_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "storyMapping"];

export const EM_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "eventModelingWorkshop"];

export const MODELING_MODE_LABELS: Record<ModelingMode, string> = {
  eventStorming: "Event Storming",
  domainDrivenDesign: "Domain-Driven Design",
  bdd: "BDD / Example Mapping",
  userStoryMapping: "User Story Mapping",
  eventModeling: "Event Modeling",
};

export const MODELING_MODE_SHORT_LABELS: Record<ModelingMode, string> = {
  eventStorming: "ES",
  domainDrivenDesign: "DDD",
  bdd: "BDD",
  userStoryMapping: "USM",
  eventModeling: "EM",
};

const ELEMENT_TYPES_BY_MODE: Record<ModelingMode, ElementType[]> = {
  eventStorming: ES_ELEMENT_TYPES,
  domainDrivenDesign: DDD_ELEMENT_TYPES,
  bdd: BDD_ELEMENT_TYPES,
  userStoryMapping: USM_ELEMENT_TYPES,
  eventModeling: EM_ELEMENT_TYPES,
};

const WORKSHOP_FORMATS_BY_MODE: Record<ModelingMode, WorkshopFormat[]> = {
  eventStorming: ES_WORKSHOP_FORMATS,
  domainDrivenDesign: DDD_WORKSHOP_FORMATS,
  bdd: BDD_WORKSHOP_FORMATS,
  userStoryMapping: USM_WORKSHOP_FORMATS,
  eventModeling: EM_WORKSHOP_FORMATS,
};

const DEFAULT_PALETTE_BY_MODE: Record<ModelingMode, ElementType> = {
  eventStorming: "domainEvent",
  domainDrivenDesign: "entity",
  bdd: "rule",
  userStoryMapping: "activity",
  eventModeling: "domainEvent",
};

export function elementTypesForMode(mode: ModelingMode): ElementType[] {
  return ELEMENT_TYPES_BY_MODE[mode];
}

export function workshopFormatsForMode(mode: ModelingMode): WorkshopFormat[] {
  return WORKSHOP_FORMATS_BY_MODE[mode];
}

export function isWorkshopFormatForMode(format: WorkshopFormat, mode: ModelingMode): boolean {
  return workshopFormatsForMode(mode).includes(format);
}

export function defaultPaletteTypeForMode(mode: ModelingMode): ElementType {
  return DEFAULT_PALETTE_BY_MODE[mode];
}

export function normalizeModelingMode(value: unknown): ModelingMode {
  if (
    value === "domainDrivenDesign" ||
    value === "bdd" ||
    value === "userStoryMapping" ||
    value === "eventModeling"
  ) {
    return value;
  }
  return "eventStorming";
}
