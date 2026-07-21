import type { ElementType, ModelingMode, WorkshopFormat } from "@/types/storm-element";
import { ALL_ELEMENT_TYPES, DDD_ELEMENT_TYPES, elementTypesForMode } from "@/types/storm-element";

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

export function getFacilitatorFormatsForMode(mode: ModelingMode): FacilitatorFormatDefinition[] {
  return mode === "domainDrivenDesign" ? DDD_FACILITATOR_FORMATS : FACILITATOR_FORMATS;
}

export function getFacilitatorFormat(format: WorkshopFormat): FacilitatorFormatDefinition | null {
  if (format === "free") return null;
  return (
    [...FACILITATOR_FORMATS, ...DDD_FACILITATOR_FORMATS].find((f) => f.format === format) ?? null
  );
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
