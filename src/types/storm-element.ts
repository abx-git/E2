export type ModelingMode =
  | "eventStorming"
  | "domainDrivenDesign"
  | "bdd"
  | "userStoryMapping"
  | "eventModeling"
  | "processFlow"
  | "dataModel"
  | "architectureDocumentation";

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
  | "slice"
  /** Process (BPMN-lite) */
  | "processStart"
  | "processEnd"
  | "processActivity"
  | "processGateway"
  /** Data model (ER-lite) */
  | "dataEntity"
  | "dataAssociation"
  /** Architecture documentation: C4 model */
  | "c4Person"
  | "c4SoftwareSystem"
  | "c4Container"
  | "c4Component"
  /** Architecture documentation: arc42 section */
  | "arc42Section"
  /** Shared: external URL or board view */
  | "link";

export type HotspotStatus = "open" | "resolved";
export type HotspotPriority = "low" | "medium" | "high";
export type SubdomainKind = "core" | "supporting" | "generic";
export type StoryPriority = "must" | "should" | "could" | "wont";
export type QuestionStatus = "open" | "resolved";
export type GatewayKind = "xor" | "and" | "or";
export type DataCardinality = "1:1" | "1:n" | "n:1" | "n:m";
export type LinkKind = "external" | "view";

export const ARC42_SECTION_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type Arc42SectionNumber = (typeof ARC42_SECTION_NUMBERS)[number];

export const ARC42_SECTION_LABELS: Record<Arc42SectionNumber, string> = {
  1: "Einleitung und Ziele",
  2: "Randbedingungen",
  3: "Kontext und Abgrenzung",
  4: "Lösungsstrategie",
  5: "Bausteinsicht",
  6: "Laufzeitsicht",
  7: "Verteilungssicht",
  8: "Querschnittliche Konzepte",
  9: "Architekturentscheidungen",
  10: "Qualitätsanforderungen",
  11: "Risiken und technische Schulden",
  12: "Glossar",
};

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

  /** Entity / Value Object / Aggregate / Data Entity: Eigenschaften („name“ oder „name: Typ“). */
  attributes?: string[];
  /** Entity / Data Entity: Identitätsfelder (z. B. „id“, „customerId“). */
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

  /** Process Activity: Rolle / Verantwortlich. */
  processRole?: string;
  /** Process Activity: System / Anwendung. */
  processSystem?: string;
  /** Process Activity: Eingaben. */
  processInputs?: string[];
  /** Process Activity: Ausgaben. */
  processOutputs?: string[];
  /** Process Activity: Dauer / SLA (Freitext). */
  processDuration?: string;
  /** Process Gateway: Art der Verzweigung. */
  gatewayKind?: GatewayKind;
  /** Process Gateway: Bedingungen / Pfade. */
  gatewayConditions?: string[];
  /** Process Start: Auslöser. */
  processTrigger?: string;
  /** Process End: Ergebnis. */
  processResult?: string;

  /** Data Entity: physischer / technischer Name (Tabelle). */
  dataTableName?: string;
  /** Data Entity: eindeutige Schlüssel (neben PK). */
  dataUniqueKeys?: string[];
  /** Data Association: Kardinalität. */
  dataCardinality?: DataCardinality;
  /** Data Association: linke / rechte Seite (Freitext-Namen). */
  dataLeftEntity?: string;
  dataRightEntity?: string;

  /** Link: extern (URL) oder intern (Sicht/Tab). */
  linkKind?: LinkKind;
  /** Link (external): Ziel-URL. */
  linkUrl?: string;
  /** Link (view): ID einer Board-Sicht. */
  linkViewId?: string;

  /** C4 Container / Component: Technologie-Stack (z. B. Spring Boot, PostgreSQL). */
  c4Technology?: string;
  /** arc42: Abschnittsnummer 1–12. */
  arc42SectionNumber?: Arc42SectionNumber;

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
  /** Stacking order within the canvas (higher = in front). */
  zIndex?: number;
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
  | "eventModelingWorkshop"
  | "processWorkshop"
  | "dataModelWorkshop"
  | "arc42Workshop"
  | "c4Modeling"
  | "ermDocumentation";

export interface Swimlane {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  /** Stacking order among swimlanes and bounded contexts (higher = in front). */
  zIndex?: number;
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
  /** Stacking order among swimlanes and bounded contexts (higher = in front). */
  zIndex?: number;
  /** Linked detail view (Sicht) with a copy of this context's contents. */
  detailViewId?: string;
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
  "processFlow",
  "dataModel",
  "architectureDocumentation",
];

/** Shared annotation types. */
export const SHARED_ELEMENT_TYPES: ElementType[] = ["note", "hotspot", "link"];

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
  "link",
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
  "link",
];

/** BDD / Example Mapping palette. */
export const BDD_ELEMENT_TYPES: ElementType[] = [
  "rule",
  "example",
  "question",
  "actor",
  "note",
  "hotspot",
  "link",
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
  "link",
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
  "link",
];

/** Business process (BPMN-lite) palette. */
export const PROCESS_ELEMENT_TYPES: ElementType[] = [
  "processStart",
  "processActivity",
  "processGateway",
  "processEnd",
  "actor",
  "note",
  "hotspot",
  "link",
];

/** Conceptual data model (ER-lite) palette. */
export const DATA_ELEMENT_TYPES: ElementType[] = [
  "dataEntity",
  "dataAssociation",
  "note",
  "hotspot",
  "link",
];

/** Architecture documentation: Arc42, C4, ERM. */
export const ARCH_DOC_ELEMENT_TYPES: ElementType[] = [
  "arc42Section",
  "c4Person",
  "c4SoftwareSystem",
  "c4Container",
  "c4Component",
  "dataEntity",
  "dataAssociation",
  "note",
  "hotspot",
  "link",
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
  "processStart",
  "processEnd",
  "processActivity",
  "processGateway",
  "dataEntity",
  "dataAssociation",
  "c4Person",
  "c4SoftwareSystem",
  "c4Container",
  "c4Component",
  "arc42Section",
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

export const PROCESS_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "processWorkshop"];

export const DATA_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "dataModelWorkshop"];

export const ARCH_DOC_WORKSHOP_FORMATS: WorkshopFormat[] = [
  "free",
  "arc42Workshop",
  "c4Modeling",
  "ermDocumentation",
];

export const MODELING_MODE_LABELS: Record<ModelingMode, string> = {
  eventStorming: "Event Storming",
  domainDrivenDesign: "Domain-Driven Design",
  bdd: "BDD / Example Mapping",
  userStoryMapping: "User Story Mapping",
  eventModeling: "Event Modeling",
  processFlow: "Prozess",
  dataModel: "Daten",
  architectureDocumentation: "Architektur Dokumentation",
};

export const MODELING_MODE_SHORT_LABELS: Record<ModelingMode, string> = {
  eventStorming: "ES",
  domainDrivenDesign: "DDD",
  bdd: "BDD",
  userStoryMapping: "USM",
  eventModeling: "EM",
  processFlow: "PROC",
  dataModel: "DATA",
  architectureDocumentation: "ARCH",
};

const ELEMENT_TYPES_BY_MODE: Record<ModelingMode, ElementType[]> = {
  eventStorming: ES_ELEMENT_TYPES,
  domainDrivenDesign: DDD_ELEMENT_TYPES,
  bdd: BDD_ELEMENT_TYPES,
  userStoryMapping: USM_ELEMENT_TYPES,
  eventModeling: EM_ELEMENT_TYPES,
  processFlow: PROCESS_ELEMENT_TYPES,
  dataModel: DATA_ELEMENT_TYPES,
  architectureDocumentation: ARCH_DOC_ELEMENT_TYPES,
};

const WORKSHOP_FORMATS_BY_MODE: Record<ModelingMode, WorkshopFormat[]> = {
  eventStorming: ES_WORKSHOP_FORMATS,
  domainDrivenDesign: DDD_WORKSHOP_FORMATS,
  bdd: BDD_WORKSHOP_FORMATS,
  userStoryMapping: USM_WORKSHOP_FORMATS,
  eventModeling: EM_WORKSHOP_FORMATS,
  processFlow: PROCESS_WORKSHOP_FORMATS,
  dataModel: DATA_WORKSHOP_FORMATS,
  architectureDocumentation: ARCH_DOC_WORKSHOP_FORMATS,
};

const DEFAULT_PALETTE_BY_MODE: Record<ModelingMode, ElementType> = {
  eventStorming: "domainEvent",
  domainDrivenDesign: "entity",
  bdd: "rule",
  userStoryMapping: "activity",
  eventModeling: "domainEvent",
  processFlow: "processActivity",
  dataModel: "dataEntity",
  architectureDocumentation: "arc42Section",
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
    value === "eventModeling" ||
    value === "processFlow" ||
    value === "dataModel" ||
    value === "architectureDocumentation"
  ) {
    return value;
  }
  return "eventStorming";
}
