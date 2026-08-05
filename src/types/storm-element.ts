export type ModelingMode =
  | "eventStorming"
  | "domainDrivenDesign"
  | "bdd"
  | "userStoryMapping"
  | "eventModeling"
  | "processFlow"
  | "dataModel"
  | "c4"
  | "arc42"
  | "cloud";

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
  /** Implementation guidance / aspects to cover when building. */
  | "instruction"
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
  /** Architecture documentation: arc42 Bausteinsicht (Blackbox / Whitebox / Komponente) */
  | "archBlackbox"
  | "archWhitebox"
  | "archComponent"
  /** Architecture documentation: Cloud / Deployment (provider-agnostic) */
  | "cloudBoundary"
  | "cloudNetwork"
  | "cloudCompute"
  | "cloudDataStore"
  | "cloudMessaging"
  | "cloudIdentity"
  | "cloudEdge"
  | "cloudManagedService"
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

/**
 * Element types that support C4-style zoom / arc42 Blackbox→Whitebox drill-down.
 * @see https://c4model.com/diagrams — Context → Container → Component
 */
export const ARCH_DRILLDOWN_ELEMENT_TYPES: ElementType[] = [
  "archBlackbox",
  "archWhitebox",
  "c4SoftwareSystem",
  "c4Container",
  "cloudBoundary",
];

export function supportsArchDrilldown(type: ElementType): boolean {
  return (
    type === "archBlackbox" ||
    type === "archWhitebox" ||
    type === "c4SoftwareSystem" ||
    type === "c4Container" ||
    type === "cloudBoundary"
  );
}

/** C4 static-structure element types (Person, System, Container, Component). */
export function isC4ElementType(type: ElementType): boolean {
  return (
    type === "c4Person" ||
    type === "c4SoftwareSystem" ||
    type === "c4Container" ||
    type === "c4Component"
  );
}

/** Architecture Baustein types (Blackbox / Whitebox / Komponente). */
export function isArchBuildingBlockType(type: ElementType): boolean {
  return type === "archBlackbox" || type === "archWhitebox" || type === "archComponent";
}

/** Cloud / deployment building blocks (provider-agnostic). */
export function isCloudElementType(type: ElementType): boolean {
  return (
    type === "cloudBoundary" ||
    type === "cloudNetwork" ||
    type === "cloudCompute" ||
    type === "cloudDataStore" ||
    type === "cloudMessaging" ||
    type === "cloudIdentity" ||
    type === "cloudEdge" ||
    type === "cloudManagedService"
  );
}

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
  /** Cloud Baustein: Provider-Hinweis (z. B. AWS, Azure, GCP) — optional, nicht typspezifisch. */
  cloudProvider?: string;
  /** @deprecated Migrated from old arc42Section stickies; ignored by UI. */
  arc42SectionNumber?: number;

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
  /**
   * Containing Aggregate Root (geometric containment).
   * Aggregates themselves never have an aggregateId (no nesting).
   */
  aggregateId?: string;
  /**
   * Containing Subdomain (geometric containment).
   * Subdomains themselves never have a subdomainId (no nesting).
   */
  subdomainId?: string;
  /**
   * Linked detail view for architecture building-block drill-down
   * (Blackbox/Whitebox → innere Komponenten).
   */
  detailViewId?: string;
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
  | "ermDocumentation"
  | "cloudArchitecture";

export interface Swimlane {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fill color (#rrggbb or legacy rgba). */
  color?: string;
  /** Fill opacity 0–1 (defaults by region type when omitted). */
  fillOpacity?: number;
  /** Border color (#rrggbb). */
  borderColor?: string;
  /** Border opacity 0–1. */
  borderOpacity?: number;
  /** When true, position/size cannot be changed on the canvas. */
  locked?: boolean;
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
  /** Fill color (#rrggbb or legacy rgba). */
  color?: string;
  /** Fill opacity 0–1 (defaults by region type when omitted). */
  fillOpacity?: number;
  /** Border color (#rrggbb). */
  borderColor?: string;
  /** Border opacity 0–1. */
  borderOpacity?: number;
  /** When true, position/size cannot be changed on the canvas. */
  locked?: boolean;
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
  "c4",
  "arc42",
  "cloud",
];

/** Shared annotation types. */
export const SHARED_ELEMENT_TYPES: ElementType[] = ["note", "instruction", "hotspot", "link"];

/** Workshop annotations / meta tools (palette footer, not core method types). */
export function isSharedElementType(type: ElementType): boolean {
  return (SHARED_ELEMENT_TYPES as ElementType[]).includes(type);
}

/** Split palette types into modeling types and trailing annotations (SHARED order). */
export function partitionPaletteTypes(types: ElementType[]): {
  modeling: ElementType[];
  annotations: ElementType[];
} {
  const allowed = new Set(types);
  return {
    modeling: types.filter((t) => !isSharedElementType(t)),
    annotations: SHARED_ELEMENT_TYPES.filter((t) => allowed.has(t)),
  };
}

/** Freeform / guidance stickies with multiline labels. */
export function isNoteLike(type: ElementType): boolean {
  return type === "note" || type === "instruction";
}

/**
 * Palette order for Event Storming — ordered by typical Big-Picture unlock
 * sequence so new phase types append below existing ones.
 */
export const ES_ELEMENT_TYPES: ElementType[] = [
  "domainEvent",
  "pivotalEvent",
  "command",
  "actor",
  "policy",
  "readModel",
  "externalSystem",
  "aggregate",
  "ui",
  ...SHARED_ELEMENT_TYPES,
];

/**
 * Palette order for Domain-Driven Design — strategic → tactical building blocks.
 */
export const DDD_ELEMENT_TYPES: ElementType[] = [
  "subdomain",
  "entity",
  "valueObject",
  "aggregate",
  "domainEvent",
  "domainService",
  "factory",
  "repository",
  "externalSystem",
  ...SHARED_ELEMENT_TYPES,
];

/** BDD / Example Mapping palette — rule → examples → questions. */
export const BDD_ELEMENT_TYPES: ElementType[] = [
  "rule",
  "example",
  "question",
  "actor",
  ...SHARED_ELEMENT_TYPES,
];

/** User Story Mapping palette — backbone → tasks → stories → releases. */
export const USM_ELEMENT_TYPES: ElementType[] = [
  "activity",
  "userTask",
  "userStory",
  "release",
  "actor",
  ...SHARED_ELEMENT_TYPES,
];

/** Event Modeling palette — timeline events → slice → UI/commands. */
export const EM_ELEMENT_TYPES: ElementType[] = [
  "domainEvent",
  "slice",
  "command",
  "ui",
  "actor",
  "readModel",
  "policy",
  "externalSystem",
  ...SHARED_ELEMENT_TYPES,
];

/** Business process (BPMN-lite) palette — start → activities → end → gateway. */
export const PROCESS_ELEMENT_TYPES: ElementType[] = [
  "processStart",
  "processActivity",
  "processEnd",
  "processGateway",
  "actor",
  ...SHARED_ELEMENT_TYPES,
];

/** Conceptual data model (ER-lite) palette. */
export const DATA_ELEMENT_TYPES: ElementType[] = [
  "dataEntity",
  "dataAssociation",
  ...SHARED_ELEMENT_TYPES,
];

/**
 * C4 model palette — Context → Container → Component (+ Whitebox scope for zoom).
 */
export const C4_ELEMENT_TYPES: ElementType[] = [
  "c4Person",
  "c4SoftwareSystem",
  "c4Container",
  "c4Component",
  "archWhitebox",
  ...SHARED_ELEMENT_TYPES,
];

/** arc42 Bausteinsicht palette — Blackbox / Whitebox / Komponente. */
export const ARC42_ELEMENT_TYPES: ElementType[] = [
  "archBlackbox",
  "archWhitebox",
  "archComponent",
  ...SHARED_ELEMENT_TYPES,
];

/** Cloud architecture palette — boundaries, workloads, data, net, identity. */
export const CLOUD_ELEMENT_TYPES: ElementType[] = [
  "cloudBoundary",
  "cloudCompute",
  "cloudEdge",
  "cloudDataStore",
  "cloudMessaging",
  "cloudNetwork",
  "cloudIdentity",
  "cloudManagedService",
  ...SHARED_ELEMENT_TYPES,
];

/**
 * @deprecated Prefer C4_ELEMENT_TYPES / ARC42_ELEMENT_TYPES / CLOUD_ELEMENT_TYPES.
 * Union kept for architecture export coverage.
 */
export const ARCH_DOC_ELEMENT_TYPES: ElementType[] = [
  ...C4_ELEMENT_TYPES.filter((t) => !SHARED_ELEMENT_TYPES.includes(t)),
  ...ARC42_ELEMENT_TYPES.filter((t) => !SHARED_ELEMENT_TYPES.includes(t) && t !== "archWhitebox"),
  ...CLOUD_ELEMENT_TYPES.filter((t) => !SHARED_ELEMENT_TYPES.includes(t)),
  "dataEntity",
  "dataAssociation",
  ...SHARED_ELEMENT_TYPES,
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
  "archBlackbox",
  "archWhitebox",
  "archComponent",
  "cloudBoundary",
  "cloudNetwork",
  "cloudCompute",
  "cloudDataStore",
  "cloudMessaging",
  "cloudIdentity",
  "cloudEdge",
  "cloudManagedService",
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

export const DATA_WORKSHOP_FORMATS: WorkshopFormat[] = [
  "free",
  "dataModelWorkshop",
  "ermDocumentation",
];

export const C4_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "c4Modeling"];

export const ARC42_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "arc42Workshop"];

export const CLOUD_WORKSHOP_FORMATS: WorkshopFormat[] = ["free", "cloudArchitecture"];

export const MODELING_MODE_LABELS: Record<ModelingMode, string> = {
  eventStorming: "Event Storming",
  domainDrivenDesign: "Domain-Driven Design",
  bdd: "BDD / Example Mapping",
  userStoryMapping: "User Story Mapping",
  eventModeling: "Event Modeling",
  processFlow: "Prozess",
  dataModel: "Daten",
  c4: "C4",
  arc42: "arc42",
  cloud: "Cloud Architektur",
};

export const MODELING_MODE_SHORT_LABELS: Record<ModelingMode, string> = {
  eventStorming: "ES",
  domainDrivenDesign: "DDD",
  bdd: "BDD",
  userStoryMapping: "USM",
  eventModeling: "EM",
  processFlow: "PROC",
  dataModel: "DATA",
  c4: "C4",
  arc42: "arc42",
  cloud: "CLOUD",
};

const ELEMENT_TYPES_BY_MODE: Record<ModelingMode, ElementType[]> = {
  eventStorming: ES_ELEMENT_TYPES,
  domainDrivenDesign: DDD_ELEMENT_TYPES,
  bdd: BDD_ELEMENT_TYPES,
  userStoryMapping: USM_ELEMENT_TYPES,
  eventModeling: EM_ELEMENT_TYPES,
  processFlow: PROCESS_ELEMENT_TYPES,
  dataModel: DATA_ELEMENT_TYPES,
  c4: C4_ELEMENT_TYPES,
  arc42: ARC42_ELEMENT_TYPES,
  cloud: CLOUD_ELEMENT_TYPES,
};

const WORKSHOP_FORMATS_BY_MODE: Record<ModelingMode, WorkshopFormat[]> = {
  eventStorming: ES_WORKSHOP_FORMATS,
  domainDrivenDesign: DDD_WORKSHOP_FORMATS,
  bdd: BDD_WORKSHOP_FORMATS,
  userStoryMapping: USM_WORKSHOP_FORMATS,
  eventModeling: EM_WORKSHOP_FORMATS,
  processFlow: PROCESS_WORKSHOP_FORMATS,
  dataModel: DATA_WORKSHOP_FORMATS,
  c4: C4_WORKSHOP_FORMATS,
  arc42: ARC42_WORKSHOP_FORMATS,
  cloud: CLOUD_WORKSHOP_FORMATS,
};

const DEFAULT_PALETTE_BY_MODE: Record<ModelingMode, ElementType> = {
  eventStorming: "domainEvent",
  domainDrivenDesign: "entity",
  bdd: "rule",
  userStoryMapping: "activity",
  eventModeling: "domainEvent",
  processFlow: "processActivity",
  dataModel: "dataEntity",
  c4: "c4SoftwareSystem",
  arc42: "archBlackbox",
  cloud: "cloudBoundary",
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

/**
 * Normalize persisted modeling mode. Legacy `architectureDocumentation` is
 * split into c4 / arc42 / cloud (and erm → dataModel) using the workshop format.
 */
export function normalizeModelingMode(
  value: unknown,
  workshopFormat?: unknown,
): ModelingMode {
  if (value === "architectureDocumentation") {
    if (workshopFormat === "c4Modeling") return "c4";
    if (workshopFormat === "cloudArchitecture") return "cloud";
    if (workshopFormat === "ermDocumentation") return "dataModel";
    return "arc42";
  }
  if (
    value === "domainDrivenDesign" ||
    value === "bdd" ||
    value === "userStoryMapping" ||
    value === "eventModeling" ||
    value === "processFlow" ||
    value === "dataModel" ||
    value === "c4" ||
    value === "arc42" ||
    value === "cloud"
  ) {
    return value;
  }
  return "eventStorming";
}

/** Normalize workshop format after mode migration (e.g. erm under Daten). */
export function normalizeWorkshopFormatForMode(
  format: unknown,
  mode: ModelingMode,
): WorkshopFormat {
  const raw = typeof format === "string" ? format : "free";
  if (isWorkshopFormatForMode(raw as WorkshopFormat, mode)) {
    return raw as WorkshopFormat;
  }
  return "free";
}
