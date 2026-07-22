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
  note: {
    title: "Notiz",
    subtitle: "Creme — freie Workshop-Annotation",
    paragraphs: [
      "Frei positionierbarer Hinweis, der nicht Teil der Event-Storming-Methode ist.",
      "Mit Verbinden / Pfeil-Handle an Stickies anknüpfen (Relation „annotiert“).",
    ],
    bullets: [
      "Für Fragen, Parkplatz-Ideen, Facilitator-Hinweise",
      "Mehrzeiliger Text auf der Karte",
      "Hintergrundfarbe in der Detailleiste oder per Rechtsklick",
    ],
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
  entity: {
    title: "Entity",
    subtitle: "Türkis — Identität über die Zeit",
    paragraphs: [
      "Domänenobjekt mit stabiler Identität; Attribute können sich ändern.",
      "Typischerweise innerhalb eines Aggregates.",
    ],
    bullets: [
      "Beispiel: „Customer“, „Order Line“",
      "Identitätsfelder und Attribute in der Detailleiste pflegen",
      "Operationen beschreiben Verhaltensänderungen",
      "Gleichheit über ID, nicht über alle Attribute",
    ],
  },
  valueObject: {
    title: "Value Object",
    subtitle: "Cyan — Wert ohne Identität",
    paragraphs: [
      "Beschreibt Eigenschaften durch Werte; austauschbar bei gleicher Struktur.",
      "Idealerweise unveränderlich.",
    ],
    bullets: [
      "Beispiel: „Money“, „Address“, „Date Range“",
      "Attribute / Komponenten in der Detailleiste listen",
      "Flag „Unveränderlich“ setzen",
      "Gleichheit über Attribute",
    ],
  },
  domainService: {
    title: "Domain Service",
    subtitle: "Indigo — Operation ohne Entity-Sitz",
    paragraphs: [
      "Domänenlogik, die nicht natürlich zu einer Entity oder einem Value Object gehört.",
      "Stateless bezogen auf den Prozess, aber fachlich relevant.",
    ],
    bullets: [
      "Nur wenn keine Entity verantwortlich ist",
      "Operationen in der Detailleiste dokumentieren",
      "Flag „Zustandslos“ prüfen",
      "Name aus der Ubiquitous Language",
    ],
  },
  repository: {
    title: "Repository",
    subtitle: "Stein — Persistenzzugriff",
    paragraphs: [
      "Abstraktion zum Laden und Speichern von Aggregate Roots.",
      "Kapselt Infrastruktur vom Domain Model.",
    ],
    bullets: [
      "Aggregate Root in der Detailleiste benennen",
      "Operationen: findById, save, …",
      "Kein SQL/ORM in Entities",
    ],
  },
  factory: {
    title: "Factory",
    subtitle: "Lime — komplexe Erzeugung",
    paragraphs: [
      "Kapselt die Erstellung von Aggregates oder komplexen Objekten.",
      "Stellt Invarianten bereits bei der Konstruktion sicher.",
    ],
    bullets: [
      "Feld „Erzeugt“: Zieltyp / Aggregate",
      "Operationen für create / reconstitute",
      "Nützlich bei mehrstufiger Initialisierung",
    ],
  },
  subdomain: {
    title: "Subdomain",
    subtitle: "Violett — Problemraum-Teil",
    paragraphs: [
      "Teil des Problemraums: Core (Differenzierung), Supporting oder Generic.",
      "Strategisches DDD — oft Vorstufe zu Bounded Contexts.",
    ],
    bullets: [
      "Art in der Detailleiste setzen (Core / Supporting / Generic)",
      "Core Domain priorisieren",
      "Nicht mit Bounded Context verwechseln (Lösung vs. Problem)",
    ],
  },
  rule: {
    title: "Rule",
    subtitle: "Amber — Geschäftsregel (Example Mapping)",
    paragraphs: [
      "Geschäftliche Regel oder Constraint zur Story — noch ohne Umsetzungstechnik.",
      "Bildet die Spalte/Cluster, unter die Examples gehören.",
    ],
    bullets: [
      "Kurz und prüfbar formulieren",
      "Akzeptanzhinweise in der Detailleiste",
      "Klassisch: gelbe Karte im Example Mapping",
    ],
  },
  example: {
    title: "Example",
    subtitle: "Grün — konkretes Szenario",
    paragraphs: [
      "Konkretes Beispiel zur Regel: Given / When / Then.",
      "Grundlage für Specs, Tests und gemeinsames Verständnis.",
    ],
    bullets: [
      "Given / When / Then in der Detailleiste",
      "Ein Example = ein Szenario",
      "Grenzfälle als eigene Examples",
    ],
  },
  question: {
    title: "Question",
    subtitle: "Himmelblau — offene Klärung",
    paragraphs: [
      "Unklarheit, die die Spec blockiert — bis zur Antwort offen halten.",
    ],
    bullets: [
      "Status offen/gelöst in der Detailleiste",
      "Owner und Follow-up in der Beschreibung",
      "Nicht mit Hotspot verwechseln (Workshop-Unsicherheit vs. Spec-Frage)",
    ],
  },
  activity: {
    title: "Activity",
    subtitle: "Blau breit — Backbone",
    paragraphs: [
      "Nutzeraktivität auf dem Story-Map-Backbone (links → rechts).",
      "Grobe Schritte der User Journey, keine technischen Tasks.",
    ],
    bullets: ["Von links nach rechts lesen", "Darunter: User Tasks stapeln"],
  },
  userTask: {
    title: "User Task",
    subtitle: "Hellblau — Aufgabe unter Activity",
    paragraphs: [
      "Konkrete Aufgabe, die Nutzer im Rahmen einer Activity erledigen.",
    ],
    bullets: ["Unter der passenden Activity platzieren", "Später in Stories zerlegen"],
  },
  userStory: {
    title: "User Story",
    subtitle: "Gelb — umsetzbare Story",
    paragraphs: [
      "Kleine, wertstiftende Lieferung: As a … I want … So that …",
    ],
    bullets: [
      "Persona, Priorität, Schätzung, Akzeptanz in der Detailleiste",
      "MoSCoW-Priorität nutzen",
    ],
  },
  release: {
    title: "Release",
    subtitle: "Rosa breit — horizontaler Schnitt",
    paragraphs: [
      "Release- oder MVP-Linie über dem Map — was in einer Version landet.",
    ],
    bullets: ["Release-Ziel formulieren", "Walking Skeleton zuerst"],
  },
  slice: {
    title: "Slice",
    subtitle: "Orange breit — Vertical Slice (Event Modeling)",
    paragraphs: [
      "Implementierbarer Ausschnitt: typischerweise UI → Command → Event → View.",
    ],
    bullets: [
      "Slice benennen und Systeme dokumentieren",
      "Events der Slice auf der Timeline clustern",
      "Reihenfolge der Umsetzung festlegen",
    ],
  },
  processStart: {
    title: "Prozess-Start",
    subtitle: "Grün rund — Einstieg in den Ablauf",
    paragraphs: ["Markiert den Beginn eines konkreten Geschäftsprozesses."],
    bullets: ["Auslöser dokumentieren (Event, Anfrage, Zeit)", "Pro Prozess ein klarer Start"],
  },
  processEnd: {
    title: "Prozess-Ende",
    subtitle: "Grau rund — Abschluss",
    paragraphs: ["Erfolgreiches oder alternatives Ende eines Ablaufs."],
    bullets: ["Ergebnis / Outcome benennen", "Mehrere Enden bei Alternativpfaden erlaubt"],
  },
  processActivity: {
    title: "Aktivität / Schritt",
    subtitle: "Blau — konkrete Arbeit im Prozess",
    paragraphs: ["Ein Schritt mit klarer Verantwortung und ggf. Systembezug."],
    bullets: [
      "Rolle und System pflegen",
      "Eingaben / Ausgaben als Attribute",
      "In Swimlanes nach Rolle oder System ordnen",
    ],
  },
  processGateway: {
    title: "Gateway",
    subtitle: "Gelb — Entscheidung / Verzweigung",
    paragraphs: ["XOR (exklusiv), AND (parallel) oder OR (inklusiv)."],
    bullets: ["Gateway-Art wählen", "Bedingungen / Pfade als Attribute listen"],
  },
  dataEntity: {
    title: "Daten-Entität",
    subtitle: "Cyan — Konzeptuelles Datenobjekt",
    paragraphs: ["Kernbaustein des Informationsmodells (nicht zwingend Tabelle)."],
    bullets: [
      "Primärschlüssel / Identitätspflege",
      "Attribute als „name: Typ“",
      "Optionalen Tabellennamen für Umsetzung",
    ],
  },
  dataAssociation: {
    title: "Assoziation",
    subtitle: "Violett — Beziehung zwischen Entitäten",
    paragraphs: ["Besonders nützlich für n:m mit eigenen Attributen."],
    bullets: [
      "Kardinalität setzen (1:1, 1:n, n:1, n:m)",
      "Mit Relationen an die beteiligten Entitäten koppeln",
      "Beziehungattribute in der Beschreibung oder als Attribute",
    ],
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
  annotates: {
    title: "Relation: annotates",
    subtitle: "Notiz ↔ Sticky",
    paragraphs: [
      "Verknüpft eine freie Notiz mit einem Domain-Element (oder umgekehrt).",
      "Kein Prozessfluss — nur Annotation / Kommentar.",
    ],
    bullets: ["Wird standardmäßig gesetzt, wenn eine Notiz beteiligt ist"],
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

