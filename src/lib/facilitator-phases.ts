import type { ElementType, ModelingMode, WorkshopFormat } from "@/types/storm-element";
import {
  ALL_ELEMENT_TYPES,
  BDD_ELEMENT_TYPES,
  DATA_ELEMENT_TYPES,
  DDD_ELEMENT_TYPES,
  EM_ELEMENT_TYPES,
  PROCESS_ELEMENT_TYPES,
  USM_ELEMENT_TYPES,
  elementTypesForMode,
} from "@/types/storm-element";

export interface FacilitatorPhase {
  id: string;
  title: string;
  description: string;
  allowedTypes: ElementType[];
  checklist: string[];
  durationMinutes?: number;
}

export interface FacilitatorFormatDefinition {
  format: WorkshopFormat;
  label: string;
  description: string;
  phases: FacilitatorPhase[];
}

const BIG_PICTURE_PHASES: FacilitatorPhase[] = [
  {
    id: "chaotic-exploration",
    title: "Chaotic Exploration",
    description: "Alle Domain Events sammeln — Vergangenheitsform, ohne Diskussion.",
    allowedTypes: ["domainEvent"],
    checklist: [
      "Alle Teilnehmer schreiben Events auf orange Notizen",
      'Past tense verwenden (z.B. "Order Placed")',
      "Noch keine Reihenfolge erzwingen",
    ],
    durationMinutes: 75,
  },
  {
    id: "enforce-timeline",
    title: "Timeline erzwingen",
    description: "Events chronologisch von links nach rechts anordnen.",
    allowedTypes: ["domainEvent", "pivotalEvent"],
    checklist: [
      "Start- und Endpunkt identifizieren",
      "Parallele Ströme erkennen",
      "Duplikate markieren",
    ],
    durationMinutes: 50,
  },
  {
    id: "enforce-consistency",
    title: "Konsistenz prüfen",
    description: "Timeline validieren, Duplikate entfernen, Lücken markieren.",
    allowedTypes: ["domainEvent", "pivotalEvent", "hotspot"],
    checklist: [
      '"Was passiert als Nächstes?" fragen',
      "Duplikate zusammenführen",
      "Offene Fragen als Hotspots markieren",
    ],
    durationMinutes: 40,
  },
  {
    id: "commands-actors",
    title: "Commands & Actors",
    description: "Für jedes Event: Was hat es ausgelöst? Wer hat es ausgeführt?",
    allowedTypes: ["domainEvent", "command", "actor", "pivotalEvent", "hotspot"],
    checklist: [
      "Pattern: [Actor] → [Command] → [Event]",
      "Commands vor Events platzieren",
      "Actors über Commands platzieren",
    ],
    durationMinutes: 55,
  },
  {
    id: "policies-readmodels",
    title: "Policies & Read Models",
    description: "Automatische Reaktionen und benötigte Informationen identifizieren.",
    allowedTypes: [
      "domainEvent", "command", "actor", "policy", "readModel",
      "pivotalEvent", "hotspot", "externalSystem",
    ],
    checklist: [
      '"When X, then Y" als Policy formulieren',
      "Read Models vor Commands platzieren",
      "Externe Systeme markieren",
    ],
    durationMinutes: 55,
  },
  {
    id: "bounded-contexts",
    title: "Bounded Contexts",
    description: "Zusammengehörige Elemente clustern und benennen.",
    allowedTypes: ALL_ELEMENT_TYPES,
    checklist: [
      "Cluster nach Vokabular und Verantwortung",
      "3–8 Bounded Contexts benennen",
      "Integrationspunkte markieren",
    ],
    durationMinutes: 75,
  },
  {
    id: "hotspots",
    title: "Hotspots",
    description: "Offene Fragen, Konflikte und Unsicherheiten erfassen.",
    allowedTypes: ALL_ELEMENT_TYPES,
    checklist: [
      '"Was ist unsicher?" fragen',
      "Hotspots priorisieren",
      "Verantwortliche zuweisen",
    ],
    durationMinutes: 30,
  },
  {
    id: "wrap-up",
    title: "Wrap-Up",
    description: "Ergebnisse dokumentieren und nächste Schritte planen.",
    allowedTypes: ALL_ELEMENT_TYPES,
    checklist: [
      "Board exportieren",
      "Hotspot-Liste erstellen",
      "Context Map dokumentieren",
      "Follow-up Sessions planen",
    ],
    durationMinutes: 30,
  },
];

const PROCESS_MODELING_PHASES: FacilitatorPhase[] = [
  {
    id: "commands-policies",
    title: "Commands & Policies vertiefen",
    description: "Geschäftsregeln und Aktionen im Detail modellieren.",
    allowedTypes: ["domainEvent", "command", "actor", "policy", "externalSystem", "hotspot"],
    checklist: ["Jede Policy mit Event und Command verknüpfen", "Edge Cases als Hotspots markieren"],
    durationMinutes: 90,
  },
  {
    id: "pivotal-events",
    title: "Pivotal Events verifizieren",
    description: "Phasenwechsel und Schlüsselmomente überprüfen.",
    allowedTypes: ["domainEvent", "pivotalEvent", "command", "policy", "hotspot"],
    checklist: ["Pivotal Events auf Timeline markieren", "Bounded-Context-Grenzen prüfen"],
    durationMinutes: 45,
  },
  {
    id: "refine-contexts",
    title: "Bounded Contexts verfeinern",
    description: "Grenzen und Benennung der Kontexte optimieren.",
    allowedTypes: ALL_ELEMENT_TYPES,
    checklist: ["Sprechende Namen verwenden", 'Keine "... Management"-Antipatterns'],
    durationMinutes: 60,
  },
  {
    id: "aggregates-readmodels",
    title: "Aggregates & Read Models",
    description: "Konsistenzgrenzen und Entscheidungsinformationen ergänzen.",
    allowedTypes: ALL_ELEMENT_TYPES,
    checklist: [
      "Aggregates zwischen Command und Event platzieren",
      "Read Models vor Entscheidungen platzieren",
      "UI-Elemente ergänzen",
    ],
    durationMinutes: 90,
  },
];

const SOFTWARE_DESIGN_PHASES: FacilitatorPhase[] = [
  {
    id: "aggregate-design",
    title: "Aggregate Design",
    description: "Commands als Methoden, Events als State Changes modellieren.",
    allowedTypes: ["aggregate", "command", "domainEvent", "policy"],
    checklist: ["Methoden pro Aggregate definieren", "Invarianten dokumentieren"],
    durationMinutes: 60,
  },
  {
    id: "event-schemas",
    title: "Event Schema Definition",
    description: "JSON-Struktur für jedes Domain Event definieren.",
    allowedTypes: ["domainEvent", "aggregate"],
    checklist: ["Schema pro Event dokumentieren", "Versionierungsstrategie festlegen"],
    durationMinutes: 60,
  },
  {
    id: "repository-service",
    title: "Repository & Service Design",
    description: "Persistenz und externe Services definieren.",
    allowedTypes: ["aggregate", "externalSystem", "readModel", "domainEvent"],
    checklist: ["Persistenzgrenzen festlegen", "Externe Service-APIs dokumentieren"],
    durationMinutes: 45,
  },
];

const STRATEGIC_DESIGN_PHASES: FacilitatorPhase[] = [
  {
    id: "subdomains",
    title: "Subdomains",
    description: "Domäne in Core, Supporting und Generic Subdomains gliedern.",
    allowedTypes: ["subdomain", "note", "hotspot"],
    checklist: [
      "Problemraum skizzieren",
      "Core Domain (Wettbewerbsvorteil) benennen",
      "Supporting und Generic abgrenzen",
    ],
    durationMinutes: 60,
  },
  {
    id: "ubiquitous-language",
    title: "Ubiquitous Language",
    description: "Gemeinsame Sprache im Glossary und auf dem Board verankern.",
    allowedTypes: ["subdomain", "note", "hotspot", "entity", "valueObject"],
    checklist: [
      "Zentrale Begriffe im Glossary erfassen",
      "Mehrdeutigkeiten als Hotspots markieren",
      "Fachsprache statt Technikjargon",
    ],
    durationMinutes: 45,
  },
  {
    id: "bounded-contexts-ddd",
    title: "Bounded Contexts",
    description: "Explizite Modellgrenzen zeichnen und benennen.",
    allowedTypes: [...DDD_ELEMENT_TYPES],
    checklist: [
      "Ein Modell / eine Sprache pro Context",
      "3–8 Bounded Contexts benennen",
      "Zuordnung Subdomain ↔ Context klären",
    ],
    durationMinutes: 75,
  },
  {
    id: "context-map",
    title: "Context Map",
    description: "Beziehungen zwischen Bounded Contexts (ACL, Shared Kernel, …).",
    allowedTypes: [...DDD_ELEMENT_TYPES],
    checklist: [
      "Context-Map-Modus: BCs verbinden",
      "Upstream/Downstream und Muster wählen",
      "Integrationsrisiken als Hotspots",
    ],
    durationMinutes: 60,
  },
  {
    id: "strategic-wrap-up",
    title: "Wrap-Up",
    description: "Strategische Entscheidungen dokumentieren und nächste Schritte.",
    allowedTypes: [...DDD_ELEMENT_TYPES],
    checklist: [
      "Context Map exportieren",
      "Core Domain priorisieren",
      "Taktisches Design planen",
    ],
    durationMinutes: 30,
  },
];

const TACTICAL_DESIGN_PHASES: FacilitatorPhase[] = [
  {
    id: "aggregates-entities",
    title: "Aggregates & Entities",
    description: "Konsistenzgrenzen und identitätsbehaftete Objekte modellieren.",
    allowedTypes: ["aggregate", "entity", "domainEvent", "hotspot", "note"],
    checklist: [
      "Aggregate Roots benennen",
      "Entities innerhalb der Grenze platzieren",
      "Transaktionsgrenzen prüfen",
    ],
    durationMinutes: 75,
  },
  {
    id: "value-objects",
    title: "Value Objects",
    description: "Werte ohne Identität — Messgrößen, Beschreibungen, Kompositionen.",
    allowedTypes: ["valueObject", "entity", "aggregate", "note", "hotspot"],
    checklist: [
      "Unveränderlichkeit und Gleichheit klären",
      "Value Objects an Entities/Aggregates anbinden",
      "Überkomplexe Entities vereinfachen",
    ],
    durationMinutes: 45,
  },
  {
    id: "services-factories",
    title: "Domain Services & Factories",
    description: "Operationen ohne natürlichen Entity-Sitz und Erzeugungslogik.",
    allowedTypes: ["domainService", "factory", "aggregate", "entity", "valueObject", "note"],
    checklist: [
      "Nur wenn keine Entity verantwortlich ist",
      "Factories für komplexe Aggregate-Erzeugung",
      "Schnittstellen kurz dokumentieren",
    ],
    durationMinutes: 45,
  },
  {
    id: "repositories-persistence",
    title: "Repositories",
    description: "Persistenzzugriff pro Aggregate Root.",
    allowedTypes: ["repository", "aggregate", "factory", "externalSystem", "note", "hotspot"],
    checklist: [
      "Ein Repository pro Aggregate Root",
      "Keine Persistenzdetails im Domain Model",
      "Externe Systeme abgrenzen",
    ],
    durationMinutes: 40,
  },
  {
    id: "domain-events-tactical",
    title: "Domain Events",
    description: "Bedeutsame Zustandsänderungen als Events festhalten.",
    allowedTypes: ["domainEvent", "aggregate", "entity", "domainService", "note", "hotspot"],
    checklist: [
      "Events aus Aggregates ableiten",
      "Vergangenheitsform / Ubiquitous Language",
      "Integration zu anderen Contexts markieren",
    ],
    durationMinutes: 45,
  },
  {
    id: "tactical-wrap-up",
    title: "Wrap-Up",
    description: "Taktisches Modell dokumentieren und offene Punkte klären.",
    allowedTypes: [...DDD_ELEMENT_TYPES],
    checklist: [
      "Invarianten und Methoden ergänzen",
      "Hotspots priorisieren",
      "Übergang zu Implementierung planen",
    ],
    durationMinutes: 30,
  },
];

/** Event-Storming workshop recipes. */
export const FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "bigPicture",
    label: "Big Picture",
    description: "Gesamtdomäne explorieren, Bounded Contexts entdecken",
    phases: BIG_PICTURE_PHASES,
  },
  {
    format: "processModeling",
    label: "Process Modeling",
    description: "Einzelnen Geschäftsprozess im Detail modellieren",
    phases: PROCESS_MODELING_PHASES,
  },
  {
    format: "softwareDesign",
    label: "Software Design",
    description: "Domänenmodell in Software-Design überführen",
    phases: SOFTWARE_DESIGN_PHASES,
  },
];

/** Domain-Driven-Design workshop recipes. */
export const DDD_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "strategicDesign",
    label: "Strategic Design",
    description: "Subdomains, Sprache, Bounded Contexts und Context Map",
    phases: STRATEGIC_DESIGN_PHASES,
  },
  {
    format: "tacticalDesign",
    label: "Tactical Design",
    description: "Entities, Value Objects, Aggregates, Services, Repositories",
    phases: TACTICAL_DESIGN_PHASES,
  },
];

const EXAMPLE_MAPPING_PHASES: FacilitatorPhase[] = [
  {
    id: "story-rules",
    title: "Story & Rules",
    description: "Geschäftsregeln zur User Story sammeln (gelbe Rules).",
    allowedTypes: ["rule", "actor", "note", "hotspot"],
    checklist: [
      "Story-Titel / Scope klären",
      "Regeln in Ubiquitous Language formulieren",
      "Akteure benennen",
    ],
    durationMinutes: 40,
  },
  {
    id: "examples",
    title: "Examples",
    description: "Konkrete Beispiele (Given/When/Then) zu den Rules.",
    allowedTypes: ["rule", "example", "actor", "note", "question"],
    checklist: [
      "Pro Rule mind. ein Example",
      "Given / When / Then in der Detailleiste",
      "Grenzfälle als eigene Examples",
    ],
    durationMinutes: 50,
  },
  {
    id: "questions",
    title: "Questions",
    description: "Unklarheiten als Questions markieren und klären.",
    allowedTypes: [...BDD_ELEMENT_TYPES],
    checklist: [
      "Offene Punkte als Question",
      "Owner / Follow-up zuweisen",
      "Geklärte Questions schließen",
    ],
    durationMinutes: 30,
  },
  {
    id: "bdd-wrap-up",
    title: "Wrap-Up",
    description: "Examples priorisieren und in Specs / Stories überführen.",
    allowedTypes: [...BDD_ELEMENT_TYPES],
    checklist: [
      "Examples für Automatisierung markieren",
      "Offene Questions dokumentieren",
      "Nächste Slices / Stories ableiten",
    ],
    durationMinutes: 25,
  },
];

const STORY_MAPPING_PHASES: FacilitatorPhase[] = [
  {
    id: "backbone",
    title: "Activities (Backbone)",
    description: "Nutzeraktivitäten von links nach rechts als Backbone.",
    allowedTypes: ["activity", "actor", "note"],
    checklist: [
      "Journey von links nach rechts",
      "Aktivitäten grob und nutzerzentriert",
      "Keine technischen Tasks im Backbone",
    ],
    durationMinutes: 40,
  },
  {
    id: "tasks",
    title: "User Tasks",
    description: "Unter jeder Activity die konkreten Tasks stapeln.",
    allowedTypes: ["activity", "userTask", "actor", "note", "hotspot"],
    checklist: [
      "Tasks unter der passenden Activity",
      "Varianten und Alternativen erfassen",
      "Hotspots für Unklarheiten",
    ],
    durationMinutes: 50,
  },
  {
    id: "stories",
    title: "User Stories",
    description: "Tasks in umsetzbare Stories zerlegen.",
    allowedTypes: [...USM_ELEMENT_TYPES],
    checklist: [
      "Persona und Akzeptanzkriterien pflegen",
      "Priorität (MoSCoW) setzen",
      "Schätzung optional ergänzen",
    ],
    durationMinutes: 60,
  },
  {
    id: "releases",
    title: "Releases / Walking Skeleton",
    description: "Horizontale Release-Schnitte ziehen.",
    allowedTypes: [...USM_ELEMENT_TYPES],
    checklist: [
      "MVP / Release-Linien legen",
      "Release-Ziel formulieren",
      "Abhängigkeiten markieren",
    ],
    durationMinutes: 40,
  },
];

const EVENT_MODELING_PHASES: FacilitatorPhase[] = [
  {
    id: "em-events",
    title: "Events auf der Timeline",
    description: "Was ist passiert? Events chronologisch anordnen.",
    allowedTypes: ["domainEvent", "slice", "note", "hotspot"],
    checklist: [
      "Past tense für Events",
      "Timeline von links nach rechts",
      "Erste Slices andeuten",
    ],
    durationMinutes: 50,
  },
  {
    id: "em-commands-ui",
    title: "Commands & UI",
    description: "Wer löst was aus? Screens und Commands ergänzen.",
    allowedTypes: ["domainEvent", "command", "ui", "actor", "slice", "note", "hotspot"],
    checklist: [
      "UI über den relevanten Events",
      "Commands vor den Events",
      "Actors zuordnen",
    ],
    durationMinutes: 45,
  },
  {
    id: "em-views-automation",
    title: "Views & Automation",
    description: "Read Models und Policies / Automation verdrahten.",
    allowedTypes: [...EM_ELEMENT_TYPES],
    checklist: [
      "Read Models für Entscheidungen",
      "Policies zwischen Event und Command",
      "Externe Systeme markieren",
    ],
    durationMinutes: 45,
  },
  {
    id: "em-slices",
    title: "Vertical Slices",
    description: "Implementierbare Slices schneiden und benennen.",
    allowedTypes: [...EM_ELEMENT_TYPES],
    checklist: [
      "Jeder Slice: UI → Command → Event → View",
      "Slice-Ziel und Systeme dokumentieren",
      "Reihenfolge der Umsetzung festlegen",
    ],
    durationMinutes: 40,
  },
];

export const BDD_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "exampleMapping",
    label: "Example Mapping",
    description: "Rules, Examples und Questions zur Spec-Klärung",
    phases: EXAMPLE_MAPPING_PHASES,
  },
];

export const USM_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "storyMapping",
    label: "Story Mapping",
    description: "Activities, Tasks, Stories und Releases",
    phases: STORY_MAPPING_PHASES,
  },
];

export const EM_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "eventModelingWorkshop",
    label: "Event Modeling",
    description: "Timeline, UI, Commands, Views und Vertical Slices",
    phases: EVENT_MODELING_PHASES,
  },
];

const PROCESS_WORKSHOP_PHASES: FacilitatorPhase[] = [
  {
    id: "process-happy-path",
    title: "Happy Path",
    description: "Start, Aktivitäten und Ende des Hauptpfads skizzieren.",
    allowedTypes: ["processStart", "processActivity", "processEnd", "note"],
    checklist: [
      "Auslöser und Ergebnis benennen",
      "Schritte in Reihenfolge legen (links → rechts)",
      "Noch keine Verzweigungen",
    ],
    durationMinutes: 40,
  },
  {
    id: "process-decisions",
    title: "Entscheidungen",
    description: "Gateways und Alternativpfade ergänzen.",
    allowedTypes: [
      "processStart",
      "processActivity",
      "processGateway",
      "processEnd",
      "note",
      "hotspot",
    ],
    checklist: [
      "XOR / AND / OR festlegen",
      "Bedingungen an Gateways dokumentieren",
      "Offene Klärungen als Hotspots",
    ],
    durationMinutes: 45,
  },
  {
    id: "process-roles-systems",
    title: "Rollen & Systeme",
    description: "Verantwortung und Systeme an Aktivitäten pflegen, Swimlanes nutzen.",
    allowedTypes: [...PROCESS_ELEMENT_TYPES],
    checklist: [
      "Rolle / System pro Aktivität",
      "Eingaben und Ausgaben ergänzen",
      "Swimlanes nach Rolle oder System",
    ],
    durationMinutes: 40,
  },
];

const DATA_MODEL_PHASES: FacilitatorPhase[] = [
  {
    id: "data-entities",
    title: "Entitäten finden",
    description: "Zentrale Informationsobjekte sammeln und benennen.",
    allowedTypes: ["dataEntity", "note"],
    checklist: [
      "Substantive aus dem Glossar / Domain-Sprache",
      "Keine technischen Tabellen-Namen erzwingen",
      "Duplikate zusammenführen",
    ],
    durationMinutes: 35,
  },
  {
    id: "data-attributes-keys",
    title: "Attribute & Schlüssel",
    description: "Felder, Identität und Eindeutigkeit modellieren.",
    allowedTypes: ["dataEntity", "note", "hotspot"],
    checklist: [
      "Primärschlüssel / Identitätsfelder",
      "Attribute als „name: Typ“",
      "Unklare Felder als Hotspot",
    ],
    durationMinutes: 45,
  },
  {
    id: "data-relationships",
    title: "Beziehungen",
    description: "Assoziationen und Kardinalitäten festlegen.",
    allowedTypes: [...DATA_ELEMENT_TYPES],
    checklist: [
      "1:1 / 1:n / n:m wählen",
      "n:m ggf. als Assoziation mit Attributen",
      "Relationen zwischen Entitäten ziehen",
    ],
    durationMinutes: 40,
  },
];

export const PROCESS_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "processWorkshop",
    label: "Prozessmodellierung",
    description: "Konkrete Abläufe mit Schritten, Gateways und Rollen",
    phases: PROCESS_WORKSHOP_PHASES,
  },
];

export const DATA_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  {
    format: "dataModelWorkshop",
    label: "Datenmodellierung",
    description: "Konzeptuelle Entitäten, Attribute und Beziehungen",
    phases: DATA_MODEL_PHASES,
  },
];

const ALL_FACILITATOR_FORMATS: FacilitatorFormatDefinition[] = [
  ...FACILITATOR_FORMATS,
  ...DDD_FACILITATOR_FORMATS,
  ...BDD_FACILITATOR_FORMATS,
  ...USM_FACILITATOR_FORMATS,
  ...EM_FACILITATOR_FORMATS,
  ...PROCESS_FACILITATOR_FORMATS,
  ...DATA_FACILITATOR_FORMATS,
];

export function getFacilitatorFormatsForMode(mode: ModelingMode): FacilitatorFormatDefinition[] {
  switch (mode) {
    case "domainDrivenDesign":
      return DDD_FACILITATOR_FORMATS;
    case "bdd":
      return BDD_FACILITATOR_FORMATS;
    case "userStoryMapping":
      return USM_FACILITATOR_FORMATS;
    case "eventModeling":
      return EM_FACILITATOR_FORMATS;
    case "processFlow":
      return PROCESS_FACILITATOR_FORMATS;
    case "dataModel":
      return DATA_FACILITATOR_FORMATS;
    default:
      return FACILITATOR_FORMATS;
  }
}

export function getFacilitatorFormat(format: WorkshopFormat): FacilitatorFormatDefinition | null {
  if (format === "free") return null;
  return ALL_FACILITATOR_FORMATS.find((f) => f.format === format) ?? null;
}

export function getAllowedTypesForPhase(
  mode: ModelingMode,
  format: WorkshopFormat,
  phaseIndex: number,
  facilitatorEnabled: boolean,
): ElementType[] {
  const catalog = elementTypesForMode(mode);
  if (!facilitatorEnabled || format === "free") return catalog;
  const def = getFacilitatorFormat(format);
  if (!def) return catalog;
  const phase = def.phases[phaseIndex];
  const raw = phase?.allowedTypes ?? catalog;
  const allowed = raw.filter((t) => catalog.includes(t));
  const list = allowed.length > 0 ? allowed : catalog;
  return list.includes("note") ? list : [...list, "note"];
}

export function getCurrentPhase(
  format: WorkshopFormat,
  phaseIndex: number,
): FacilitatorPhase | null {
  if (format === "free") return null;
  const def = getFacilitatorFormat(format);
  if (!def) return null;
  return def.phases[phaseIndex] ?? null;
}
