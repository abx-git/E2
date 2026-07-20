import type { FacilitatorPhase } from "@/lib/facilitator-phases";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";
import { CONTEXT_MAP_PATTERN_LABELS } from "@/types/storm-relation";

export interface HelpDialogModel {
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  bullets?: string[];
  chips?: string[];
}

const ELEMENT_HELP: Record<ElementType, HelpDialogModel> = {
  domainEvent: {
    title: "Domain Event",
    subtitle: "Orange Sticky — „Was ist passiert?“",
    paragraphs: [
      "Fakt aus der Vergangenheit. Formuliere im Past Tense (Vergangenheitsform).",
      "Platzierung: entlang der Timeline (links → rechts).",
    ],
    bullets: [
      "Beispiel: „Order Placed“, „Payment Processed“",
      "Start mit Quantität: erst viele Events, dann sortieren",
      "Event-Duplikate später zusammenführen",
    ],
  },
  command: {
    title: "Command",
    subtitle: "Blau Sticky — „Was triggert das Event?“",
    paragraphs: [
      "Imperative Aktion, die den Zustand/Prozess anstößt.",
      "Platzierung: vor dem auslösenden Event.",
    ],
    bullets: [
      "Beispiel: „Place Order“, „Confirm Delivery“",
      "Oft wird ein Command später einem Aggregate- oder Handler-Konzept zugeordnet",
    ],
  },
  actor: {
    title: "Actor / User",
    subtitle: "Kleines Gelb — „Wer macht das?“",
    paragraphs: ["Wer führt den Command aus (Person/Rolle oder auch System als Auslöser)."],
    bullets: ["Pattern: Actor → Command → Event", "Actor-Notiz typischerweise oberhalb des Commands"],
  },
  aggregate: {
    title: "Aggregate",
    subtitle: "Gelbes Rechteck — „Grenze & Invarianten“",
    paragraphs: [
      "Cluster von Domänenobjekten, das Commands verarbeitet und Events erzeugt.",
      "Platzierung: zwischen Command(s) und Event(s).",
    ],
    bullets: ["Hilft bei Microservice-/Boundary-Erkennung", "Später: Methoden & Invarianten pro Aggregate"],
  },
  policy: {
    title: "Policy",
    subtitle: "Lila — „When X, then Y“",
    paragraphs: [
      "Business Regel/Automatik, die auf Ereignisse reagiert.",
      "Platzierung: zwischen Event und dem nachfolgenden Command.",
    ],
    bullets: [
      'Beispiel: "When payment received, confirm order"',
      "Stelle Fragen, falls Policies widersprüchlich wirken",
    ],
  },
  readModel: {
    title: "Read Model",
    subtitle: "Grün — „Welche Information brauche ich?“",
    paragraphs: ["Informationen/Queries, die für Entscheidungen oder Command-Ausführungen benötigt werden."],
    bullets: ["Platzierung: vor Commands", "Oft: Bildschirme/Listen/Status"],
  },
  externalSystem: {
    title: "External System",
    subtitle: "Pink — „Integration außerhalb der Domäne“",
    paragraphs: ["Drittes System außerhalb des Boundaries, das Events liefert oder Commands empfängt."],
    bullets: ["Markiere externe Abhängigkeiten", "Hilft später bei Service-/API-Design"],
  },
  ui: {
    title: "UI",
    subtitle: "Weiß — „View/Screen“",
    paragraphs: [
      "Benutzeroberfläche oder UI-Komponente, die Events anzeigt und Commands auslöst.",
    ],
    bullets: ["Hilfreich für Actor → Command Kontext", "Kann später direkte Screen-Checks ermöglichen"],
  },
  hotspot: {
    title: "Hotspot",
    subtitle: "Rot (45°) — „Offene Frage / Konflikt“",
    paragraphs: ["Markiert Unsicherheiten, Widersprüche, Reibungen oder noch nicht verstandene Regeln."],
    bullets: [
      "Hotspots priorisieren und am Ende klären",
      "Hotspot-Typische Idee: erst später detaillieren",
    ],
  },
  pivotalEvent: {
    title: "Pivotal Event",
    subtitle: "Gelber Langblock — „Phasenwechsel“",
    paragraphs: [
      "Signifikantes Ereignis, das den Kurs/Charakter des Prozesses ändert.",
      "Hilft beim Erkennen von Zeit- oder Boundary-Wechseln.",
    ],
    bullets: ["Platzierung: prominent auf der Timeline", "Oft: liefert Hinweise auf bounded contexts"],
  },
};

const RELATION_HELP: Record<RelationType, HelpDialogModel> = {
  triggers: {
    title: "Relation: triggers",
    subtitle: "Command → Event",
    paragraphs: ["Zeigt die Auslösekette: dieses Command führt zu diesem Event."],
    bullets: ["Typische Darstellung: Pfeil mit klarer Richtung (Command → Event)"],
  },
  reactsWith: {
    title: "Relation: reactsWith",
    subtitle: "Event → Policy → Command",
    paragraphs: ["Policy reagiert auf ein Event und startet (indirekt) das folgende Command."],
    bullets: ["Hilfreich für Regeln & automatisierte Reaktionen"],
  },
  informs: {
    title: "Relation: informs",
    subtitle: "Read Model → Command",
    paragraphs: ["Read Model liefert notwendige Entscheidungsinformation für das Command."],
    bullets: ["Hilft später, welche Daten/Queries pro Handler gebraucht werden"],
  },
  executedBy: {
    title: "Relation: executedBy",
    subtitle: "Actor → Command",
    paragraphs: ["Actor führt dieses Command aus."],
    bullets: ["Pattern: Actor → Command → Event"],
  },
  invokes: {
    title: "Relation: invokes",
    subtitle: "External System ↔ Command/Event",
    paragraphs: ["Markiert die Interaktion mit einem externen System (Integration)."],
    bullets: ["Hilft bei API-/Gateway-Schnittstellen"],
  },
  causal: {
    title: "Relation: causal",
    subtitle: "Event → Event",
    paragraphs: ["Zeitliche/inhaltliche Kausalität zwischen zwei Events."],
    bullets: ["Oft ergänzt mit Swimlanes oder parallelen Streams"],
  },
  contains: {
    title: "Relation: contains",
    subtitle: "Aggregate umschließt Elemente",
    paragraphs: ["Visuelle/gruppierende Beziehung: dieses Aggregate umfasst Elemente innerhalb seiner Boundary."],
    bullets: ["In E2 aktuell als Relation-Typ dokumentiert (Bounded Context / Aggregate sind primär visuelle Elemente)."],
  },
};

export function getElementHelp(type: ElementType): HelpDialogModel {
  return ELEMENT_HELP[type];
}

export function getRelationHelp(type: RelationType): HelpDialogModel {
  return RELATION_HELP[type];
}

const CONTEXT_MAP_HELP: Record<ContextMapPattern, HelpDialogModel> = {
  partnership: {
    title: "Partnership",
    subtitle: "Gleichberechtigte Zusammenarbeit",
    paragraphs: [
      "Beide Bounded Contexts stimmen Änderungen gemeinsam ab. Kein klarer Upstream/Downstream.",
    ],
    bullets: ["Hohe Kopplung bei gemeinsamen Entscheidungen", "Nur bei stark geteiltem Interesse"],
  },
  sharedKernel: {
    title: "Shared Kernel",
    subtitle: "Gemeinsames Modell",
    paragraphs: [
      "Ein kleiner, bewusst geteilter Modellkern. Änderungen brauchen Abstimmung beider Teams.",
    ],
    bullets: ["Klein halten", "Klare Ownership für den Kern"],
  },
  customerSupplier: {
    title: "Customer / Supplier",
    subtitle: "Upstream liefert, Downstream konsumiert",
    paragraphs: [
      "Der Supplier (source) liefert ein Modell; der Customer (target) hängt davon ab und kann Anforderungen stellen.",
    ],
    bullets: ["Upstream = sourceContextId", "Downstream = targetContextId"],
  },
  conformist: {
    title: "Conformist",
    subtitle: "Downstream übernimmt Upstream-Modell",
    paragraphs: [
      "Der Downstream übernimmt das Upstream-Modell 1:1, ohne eigene Übersetzung.",
    ],
    bullets: ["Weniger Aufwand als ACL", "Stärkere Abhängigkeit vom Upstream"],
  },
  antiCorruptionLayer: {
    title: "Anti-Corruption Layer",
    subtitle: "Übersetzungsschicht am Rand",
    paragraphs: [
      "Der Downstream schützt sein Modell mit einer Übersetzungsschicht gegen fremde Konzepte.",
    ],
    bullets: ["Empfohlen bei Cross-Context-Integrationen", "Mapping statt direktes Modell-Übernehmen"],
  },
  openHostService: {
    title: "Open-Host Service",
    subtitle: "Protokoll für viele Downstream-Clients",
    paragraphs: [
      "Der Upstream bietet ein standardisiertes Protokoll/API für mehrere Consumer.",
    ],
    bullets: ["Oft kombiniert mit Published Language"],
  },
  publishedLanguage: {
    title: "Published Language",
    subtitle: "Gemeinsame Integrationssprache",
    paragraphs: [
      "Eine dokumentierte Sprache (Schema, Events) für den Austausch zwischen Contexts.",
    ],
    bullets: ["Versionierung beachten", "Oft zusammen mit OHS"],
  },
  separateWays: {
    title: "Separate Ways",
    subtitle: "Keine Integration",
    paragraphs: [
      "Die Contexts integrieren sich bewusst nicht — doppelte Funktionalität wird akzeptiert.",
    ],
    bullets: ["Weniger Kopplung", "Mögliche Redundanz"],
  },
};

export function getContextMapHelp(type: ContextMapPattern): HelpDialogModel {
  return CONTEXT_MAP_HELP[type] ?? {
    title: CONTEXT_MAP_PATTERN_LABELS[type],
    paragraphs: ["DDD Context-Map-Muster."],
  };
}

export function getPhaseHelp(format: WorkshopFormat, phase: FacilitatorPhase): HelpDialogModel {
  return {
    title: `Facilitator Phase: ${phase.title}`,
    subtitle: `${format} — Standard-Workflow & Checkliste`,
    paragraphs: [phase.description, `Erlaubte Elemente: ${phase.allowedTypes.length}`],
    bullets: [
      ...phase.checklist,
      "",
      "Tipp: Arbeite erst schnell, dann konsolidieren.",
    ],
    chips: [
      ...phase.allowedTypes.slice(0, 6).map(String),
      ...(phase.allowedTypes.length > 6 ? [`+${phase.allowedTypes.length - 6} weitere`] : []),
    ],
  };
}

