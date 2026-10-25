export const facilitatorPhasesDe = {
  facilitatorPhases: {
    formats: {
    "bigPicture": {
      label: "Big Picture",
      description: "Gesamtdomäne explorieren, Bounded Contexts entdecken",
    },
    "processModeling": {
      label: "Process Modeling",
      description: "Einzelnen Geschäftsprozess im Detail modellieren",
    },
    "softwareDesign": {
      label: "Software Design",
      description: "Domänenmodell in Software-Design überführen",
    },
    "strategicDesign": {
      label: "Strategic Design",
      description: "Subdomains, Sprache, Bounded Contexts und Context Map",
    },
    "tacticalDesign": {
      label: "Tactical Design",
      description: "Entities, Value Objects, Aggregates, Services, Repositories",
    },
    "exampleMapping": {
      label: "Example Mapping",
      description: "Rules, Examples und Questions zur Spec-Klärung",
    },
    "storyMapping": {
      label: "Story Mapping",
      description: "Activities, Tasks, Stories und Releases",
    },
    "eventModelingWorkshop": {
      label: "Event Modeling",
      description: "Timeline, UI, Commands, Views und Vertical Slices",
    },
    "processWorkshop": {
      label: "Prozessmodellierung",
      description: "Konkrete Abläufe mit Schritten, Gateways und Rollen",
    },
    "arc42Workshop": {
      label: "arc42 Workshop",
      description: "Bausteinsicht mit Zoom (Blackbox → Whitebox → Komponente)",
    },
    "c4Modeling": {
      label: "C4 Modellierung",
      description: "Kontext → Container → Komponenten (Zoom wie auf c4model.com/diagrams)",
    },
    "cloudArchitecture": {
      label: "Cloud Workshop",
      description: "Grenzen → Workloads → Daten/Messaging → Netz/IAM (provider-agnostisch)",
    },
    "dataModelWorkshop": {
      label: "Datenmodellierung",
      description: "Konzeptuelle Entitäten, Attribute und Beziehungen",
    },
    "ermDocumentation": {
      label: "ERM Dokumentation",
      description: "Entitäten, Attribute und Beziehungen",
    }
    },
    phases: {
    "chaotic-exploration": {
      title: "Chaotic Exploration",
      description: "Alle Domain Events sammeln — Vergangenheitsform, ohne Diskussion.",
      checklist: ["Alle Teilnehmer schreiben Events auf orange Notizen", "Order Placed", "Noch keine Reihenfolge erzwingen"],
    },
    "enforce-timeline": {
      title: "Timeline erzwingen",
      description: "Events chronologisch von links nach rechts anordnen.",
      checklist: ["Start- und Endpunkt identifizieren", "Parallele Ströme erkennen", "Duplikate markieren"],
    },
    "enforce-consistency": {
      title: "Konsistenz prüfen",
      description: "Timeline validieren, Duplikate entfernen, Lücken markieren.",
      checklist: ["Was passiert als Nächstes?", "Duplikate zusammenführen", "Offene Fragen als Hotspots markieren"],
    },
    "commands-actors": {
      title: "Commands & Actors",
      description: "Für jedes Event: Was hat es ausgelöst? Wer hat es ausgeführt?",
      checklist: [],
    },
    "policies-readmodels": {
      title: "Policies & Read Models",
      description: "Automatische Reaktionen und benötigte Informationen identifizieren.",
      checklist: ["When X, then Y", "Read Models vor Commands platzieren", "Externe Systeme markieren"],
    },
    "bounded-contexts": {
      title: "Bounded Contexts",
      description: "Zusammengehörige Elemente clustern und benennen.",
      checklist: ["Cluster nach Vokabular und Verantwortung", "3–8 Bounded Contexts benennen", "Integrationspunkte markieren"],
    },
    "hotspots": {
      title: "Hotspots",
      description: "Offene Fragen, Konflikte und Unsicherheiten erfassen.",
      checklist: ["Was ist unsicher?", "Hotspots priorisieren", "Verantwortliche zuweisen"],
    },
    "wrap-up": {
      title: "Wrap-Up",
      description: "Ergebnisse dokumentieren und nächste Schritte planen.",
      checklist: ["Board exportieren", "Hotspot-Liste erstellen", "Context Map dokumentieren", "Follow-up Sessions planen"],
    },
    "commands-policies": {
      title: "Commands & Policies vertiefen",
      description: "Geschäftsregeln und Aktionen im Detail modellieren.",
      checklist: ["Jede Policy mit Event und Command verknüpfen", "Edge Cases als Hotspots markieren"],
    },
    "pivotal-events": {
      title: "Pivotal Events verifizieren",
      description: "Phasenwechsel und Schlüsselmomente überprüfen.",
      checklist: ["Pivotal Events auf Timeline markieren", "Bounded-Context-Grenzen prüfen"],
    },
    "refine-contexts": {
      title: "Bounded Contexts verfeinern",
      description: "Grenzen und Benennung der Kontexte optimieren.",
      checklist: ["Sprechende Namen verwenden", "... Management"],
    },
    "aggregates-readmodels": {
      title: "Aggregates & Read Models",
      description: "Konsistenzgrenzen und Entscheidungsinformationen ergänzen.",
      checklist: ["Aggregates zwischen Command und Event platzieren", "Read Models vor Entscheidungen platzieren", "UI-Elemente ergänzen"],
    },
    "aggregate-design": {
      title: "Aggregate Design",
      description: "Commands als Methoden, Events als State Changes modellieren.",
      checklist: ["Methoden pro Aggregate definieren", "Invarianten dokumentieren"],
    },
    "event-schemas": {
      title: "Event Schema Definition",
      description: "JSON-Struktur für jedes Domain Event definieren.",
      checklist: ["Schema pro Event dokumentieren", "Versionierungsstrategie festlegen"],
    },
    "repository-service": {
      title: "Repository & Service Design",
      description: "Persistenz und externe Services definieren.",
      checklist: ["Persistenzgrenzen festlegen", "Externe Service-APIs dokumentieren"],
    },
    "subdomains": {
      title: "Subdomains",
      description: "Domäne in Core, Supporting und Generic Subdomains gliedern.",
      checklist: ["Problemraum skizzieren", "Core Domain (Wettbewerbsvorteil) benennen", "Supporting und Generic abgrenzen"],
    },
    "ubiquitous-language": {
      title: "Ubiquitous Language",
      description: "Gemeinsame Sprache im Glossary und auf dem Board verankern.",
      checklist: ["Zentrale Begriffe im Glossary erfassen", "Mehrdeutigkeiten als Hotspots markieren", "Fachsprache statt Technikjargon"],
    },
    "bounded-contexts-ddd": {
      title: "Bounded Contexts",
      description: "Explizite Modellgrenzen zeichnen und benennen.",
      checklist: ["Ein Modell / eine Sprache pro Context", "3–8 Bounded Contexts benennen", "Zuordnung Subdomain ↔ Context klären"],
    },
    "context-map": {
      title: "Context Map",
      description: "Beziehungen zwischen Bounded Contexts (ACL, Shared Kernel, …).",
      checklist: ["Context-Map-Modus: BCs verbinden", "Upstream/Downstream und Muster wählen", "Integrationsrisiken als Hotspots"],
    },
    "strategic-wrap-up": {
      title: "Wrap-Up",
      description: "Strategische Entscheidungen dokumentieren und nächste Schritte.",
      checklist: ["Context Map exportieren", "Core Domain priorisieren", "Taktisches Design planen"],
    },
    "aggregates-entities": {
      title: "Aggregates & Entities",
      description: "Konsistenzgrenzen und identitätsbehaftete Objekte modellieren.",
      checklist: ["Aggregate Roots benennen", "Entities innerhalb der Grenze platzieren", "Transaktionsgrenzen prüfen"],
    },
    "value-objects": {
      title: "Value Objects",
      description: "Werte ohne Identität — Messgrößen, Beschreibungen, Kompositionen.",
      checklist: ["Unveränderlichkeit und Gleichheit klären", "Value Objects an Entities/Aggregates anbinden", "Überkomplexe Entities vereinfachen"],
    },
    "services-factories": {
      title: "Domain Services & Factories",
      description: "Operationen ohne natürlichen Entity-Sitz und Erzeugungslogik.",
      checklist: ["Nur wenn keine Entity verantwortlich ist", "Factories für komplexe Aggregate-Erzeugung", "Schnittstellen kurz dokumentieren"],
    },
    "repositories-persistence": {
      title: "Repositories",
      description: "Persistenzzugriff pro Aggregate Root.",
      checklist: ["Ein Repository pro Aggregate Root", "Keine Persistenzdetails im Domain Model", "Externe Systeme abgrenzen"],
    },
    "domain-events-tactical": {
      title: "Domain Events",
      description: "Bedeutsame Zustandsänderungen als Events festhalten.",
      checklist: ["Events aus Aggregates ableiten", "Vergangenheitsform / Ubiquitous Language", "Integration zu anderen Contexts markieren"],
    },
    "tactical-wrap-up": {
      title: "Wrap-Up",
      description: "Taktisches Modell dokumentieren und offene Punkte klären.",
      checklist: ["Invarianten und Methoden ergänzen", "Hotspots priorisieren", "Übergang zu Implementierung planen"],
    },
    "story-rules": {
      title: "Story & Rules",
      description: "Geschäftsregeln zur User Story sammeln (gelbe Rules).",
      checklist: ["Story-Titel / Scope klären", "Regeln in Ubiquitous Language formulieren", "Akteure benennen"],
    },
    "examples": {
      title: "Examples",
      description: "Konkrete Beispiele (Given/When/Then) zu den Rules.",
      checklist: ["Pro Rule mind. ein Example", "Given / When / Then in der Detailleiste", "Grenzfälle als eigene Examples"],
    },
    "questions": {
      title: "Questions",
      description: "Unklarheiten als Questions markieren und klären.",
      checklist: ["Offene Punkte als Question", "Owner / Follow-up zuweisen", "Geklärte Questions schließen"],
    },
    "bdd-wrap-up": {
      title: "Wrap-Up",
      description: "Examples priorisieren und in Specs / Stories überführen.",
      checklist: ["Examples für Automatisierung markieren", "Offene Questions dokumentieren", "Nächste Slices / Stories ableiten"],
    },
    "backbone": {
      title: "Activities (Backbone)",
      description: "Nutzeraktivitäten von links nach rechts als Backbone.",
      checklist: ["Journey von links nach rechts", "Aktivitäten grob und nutzerzentriert", "Keine technischen Tasks im Backbone"],
    },
    "tasks": {
      title: "User Tasks",
      description: "Unter jeder Activity die konkreten Tasks stapeln.",
      checklist: ["Tasks unter der passenden Activity", "Varianten und Alternativen erfassen", "Hotspots für Unklarheiten"],
    },
    "stories": {
      title: "User Stories",
      description: "Tasks in umsetzbare Stories zerlegen.",
      checklist: ["Persona und Akzeptanzkriterien pflegen", "Priorität (MoSCoW) setzen", "Schätzung optional ergänzen"],
    },
    "releases": {
      title: "Releases / Walking Skeleton",
      description: "Horizontale Release-Schnitte ziehen.",
      checklist: ["MVP / Release-Linien legen", "Release-Ziel formulieren", "Abhängigkeiten markieren"],
    },
    "em-events": {
      title: "Events auf der Timeline",
      description: "Was ist passiert? Events chronologisch anordnen.",
      checklist: ["Past tense für Events", "Timeline von links nach rechts", "Erste Slices andeuten"],
    },
    "em-commands-ui": {
      title: "Commands & UI",
      description: "Wer löst was aus? Screens und Commands ergänzen.",
      checklist: ["UI über den relevanten Events", "Commands vor den Events", "Actors zuordnen"],
    },
    "em-views-automation": {
      title: "Views & Automation",
      description: "Read Models und Policies / Automation verdrahten.",
      checklist: ["Read Models für Entscheidungen", "Policies zwischen Event und Command", "Externe Systeme markieren"],
    },
    "em-slices": {
      title: "Vertical Slices",
      description: "Implementierbare Slices schneiden und benennen.",
      checklist: ["Jeder Slice: UI → Command → Event → View", "Slice-Ziel und Systeme dokumentieren", "Reihenfolge der Umsetzung festlegen"],
    },
    "process-happy-path": {
      title: "Happy Path",
      description: "Start, Aktivitäten und Ende des Hauptpfads skizzieren.",
      checklist: ["Auslöser und Ergebnis benennen", "Schritte in Reihenfolge legen (links → rechts)", "Noch keine Verzweigungen"],
    },
    "process-decisions": {
      title: "Entscheidungen",
      description: "Gateways und Alternativpfade ergänzen.",
      checklist: ["XOR / AND / OR festlegen", "Bedingungen an Gateways dokumentieren", "Offene Klärungen als Hotspots"],
    },
    "process-roles-systems": {
      title: "Rollen & Systeme",
      description: "Verantwortung und Systeme an Aktivitäten pflegen, Swimlanes nutzen.",
      checklist: ["Rolle / System pro Aktivität", "Eingaben und Ausgaben ergänzen", "Swimlanes nach Rolle oder System"],
    },
    "data-entities": {
      title: "Entitäten finden",
      description: "Zentrale Informationsobjekte sammeln und benennen.",
      checklist: ["Substantive aus dem Glossar / Domain-Sprache", "Keine technischen Tabellen-Namen erzwingen", "Duplikate zusammenführen"],
    },
    "data-attributes-keys": {
      title: "Attribute & Schlüssel",
      description: "Felder, Identität und Eindeutigkeit modellieren.",
      checklist: ["Primärschlüssel / Identitätsfelder", "Attribute als „name: Typ“", "Unklare Felder als Hotspot"],
    },
    "data-relationships": {
      title: "Beziehungen",
      description: "Assoziationen und Kardinalitäten festlegen.",
      checklist: ["1:1 / 1:n / n:m wählen", "n:m ggf. als Assoziation mit Attributen", "Relationen zwischen Entitäten ziehen"],
    },
    "arc42-context": {
      title: "Kontext (Level 1)",
      description: "Blackbox im Umfeld — zentrale Systeme und Schnittstellen der Bausteinsicht.",
      checklist: ["Zentrales System als Blackbox", "Externe Systeme als weitere Blackboxes", "Beziehungen beschriften (nicht nur „nutzt“)"],
    },
    "arc42-building-blocks": {
      title: "Bausteinsicht (Zoom)",
      description: "Drill-down: Blackbox → Whitebox → Komponenten.",
      checklist: ["Detail-Sicht je Blackbox öffnen", "Whitebox als Scope; Komponenten innen", "Optional erneut in Unter-Bausteine zoomen"],
    },
    "arc42-runtime-deploy": {
      title: "Laufzeit & Verteilung",
      description: "Dynamik und Deployment mit Bausteinen und Notizen.",
      checklist: ["Laufzeitpfade als Relationen/Notizen", "Verteilung über Blackboxes / Komponenten", "Hotspots für offene Fragen"],
    },
    "arc42-decisions": {
      title: "Entscheidungen & Risiken",
      description: "ADRs, Qualität und technische Schulden festhalten.",
      checklist: ["Architekturentscheidungen als Notizen/Links", "Qualitätsanforderungen und Risiken (Hotspots)", "Glossar-Panel parallel pflegen"],
    },
    "c4-context": {
      title: "Kontextdiagramm",
      description: "C4 Level 1: Personen und Software-Systeme. Systeme sind Blackboxes — Zoom erst in der nächsten Phase.",
      checklist: ["Zentrales System klar benennen", "Externe Systeme und Nutzer einzeichnen", "Detail-Sicht am System für Container-Zoom vorbereiten"],
    },
    "c4-container": {
      title: "Container-Diagramm",
      description: "C4 Level 2: Zoom in ein Software-System — Container (Apps, DBs) innerhalb der Whitebox-/Systemgrenze.",
      checklist: ["Detail-Sicht aus dem Software-System öffnen", "Container mit Technologie beschriften", "Kommunikationswege und Protokolle als Relationen"],
    },
    "c4-component": {
      title: "Komponenten-Diagramm",
      description: "C4 Level 3: Zoom in einen Container — Komponenten und Verantwortlichkeiten (optional).",
      checklist: ["Detail-Sicht aus dem Container öffnen", "Komponenten und Verantwortlichkeiten", "Nur anlegen, wenn der Zoom Mehrwert bringt"],
    },
    "erm-entities": {
      title: "Entitäten",
      description: "Zentrale Datenobjekte für das Informationsmodell.",
      checklist: ["Begriffe aus Glossar / Domain-Sprache", "Bounded Context pro Schema-Bereich", "Keine technischen Tabellennamen erzwingen"],
    },
    "erm-attributes": {
      title: "Attribute & Schlüssel",
      description: "Felder, Identität und Eindeutigkeit modellieren.",
      checklist: ["Primärschlüssel / Identitätsfelder", "Attribute als „name: Typ“", "Unklare Felder als Hotspot"],
    },
    "erm-relationships": {
      title: "Beziehungen",
      description: "Assoziationen und Kardinalitäten festlegen.",
      checklist: ["1:1 / 1:n / n:m wählen", "Relationen zwischen Entitäten ziehen", "ERM-Detail per Bounded Context drill-down"],
    },
    "cloud-context": {
      title: "Kontext & Grenzen",
      description: "Accounts, Landing Zones und externe Systeme — die äußere Cloud-Grenze vor Workloads.",
      checklist: ["Cloud-Grenzen (Account / Subscription / Projekt) benennen", "Provider optional setzen", "Externe SaaS / Partner als Managed Service"],
    },
    "cloud-workloads": {
      title: "Workloads",
      description: "Compute, Edge und Managed Services innerhalb der Grenzen platzieren.",
      checklist: ["Detail-Sicht aus einer Cloud-Grenze öffnen", "Workloads mit Technologie/Dienst beschriften", "Öffentliche Einstiegspunkte als Edge markieren"],
    },
    "cloud-data-integration": {
      title: "Daten & Integration",
      description: "Speicher, Messaging und Datenflüsse zwischen Workloads.",
      checklist: ["Primärspeicher vs. Cache / Analytics trennen", "Queues und Event-Streams als Messaging", "Producer → Consumer Relationen beschriften"],
    },
    "cloud-network-identity": {
      title: "Netz & Identity",
      description: "Connectivity, Trust Boundaries und Zugriffskontrolle.",
      checklist: ["Netzsegmente und Peering skizzieren", "IAM / Workload-Identitäten einzeichnen", "Trust Boundaries und Hotspots für Lücken"],
    },
    "cloud-risks": {
      title: "Risiken & Entscheidungen",
      description: "Kosten, Resilienz, Compliance und offene Architekturfragen.",
      checklist: ["ADRs und Qualitätsziele als Notizen/Links", "Single Points of Failure und Vendor Lock-in", "Offene Punkte als Hotspots priorisieren"],
    }
    },
  },
} as const;
