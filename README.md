# E2 — Collaborative Domain Modeling

Browserbasiertes Board für **Event Storming**, **Domain-Driven Design**, **BDD / Example Mapping**, **User Story Mapping** und **Event Modeling** mit lokaler JSON-Persistenz (`.storm.json`).  
Kein Server für Domänendaten — die Arbeitsdatei liegt beim Nutzer.

**Live:** [abx-git.github.io/E2](https://abx-git.github.io/E2/)  
**Repository:** [github.com/abx-git/E2](https://github.com/abx-git/E2)

---

## Zweck dieses Dokuments

Diese README beschreibt die **implementierten Funktionen** und stellt sie klassischen Workshop-Methoden gegenüber (Brandolini, Evans/Vernon, Example Mapping, Story Mapping, Event Modeling).

---

## Kurzüberblick

| Bereich | Inhalt |
|--------|--------|
| Methoden-Modi | ES · DDD · BDD · USM · EM (Palette/Facilitator getrennt); Board darf Typen mischen |
| Sticky-Typen | Methodenspezifische Kataloge + geteilte Notizen/Hotspots |
| Relationen | 8 Verbindungstypen inkl. Auto-Vorschlag |
| Fläche | Timeline, Swimlanes, Bounded Contexts, Pan/Zoom |
| Workshop | Pro Modus eigene Facilitator-Formate + Frei |
| Sprache | Glossary (Ubiquitous Language) |
| Unsicherheit | Hotspots inkl. Status/Priorität |
| I/O | `.storm.json` + Schema, SVG/PNG, Markdown-Reports |
| UX | Mehrfachauswahl, Ausrichten, Rechtsklick-Menüs, Farben |

---

## 1. Elementtypen (Stickies)

Die **Palette** zeigt nur Typen des aktiven Methoden-Modus (im Facilitator zusätzlich phasenweise eingeschränkt).  
Bereits platzierte Stickies bleiben beim Moduswechsel sichtbar — Elemente der anderen Methode sind leicht abgesetzt (gestrichelter Rahmen).

### Event Storming

| Typ | Farbe / Form | Methodische Rolle |
|-----|--------------|-------------------|
| **Domain Event** | Orange | „Was ist passiert?“ (Vergangenheit) |
| **Command** | Blau | „Was soll geschehen?“ / Auslöser |
| **Actor** | Gelb (Pill) | Wer führt den Command aus? |
| **Aggregate** | Gelbes Rechteck | Konsistenzgrenze, Commands → Events |
| **Policy** | Lila | „When X, then Y“ |
| **Read Model** | Grün | Benötigte Information für Entscheidungen |
| **External System** | Pink | Integration außerhalb der Domäne |
| **UI** | Grau/Weiß | Screen / View |
| **Notiz** | Creme, gestrichelt (Farbe wählbar) | Freie Annotation (Workshop-Hinweis) |
| **Hotspot** | Rot, gedreht | Offene Frage, Konflikt, Unklarheit |
| **Pivotal Event** | Breiter gelber Block | Phasenwechsel / signifikanter Einschnitt |

### Domain-Driven Design

| Typ | Farbe / Form | Methodische Rolle |
|-----|--------------|-------------------|
| **Subdomain** | Violett | Problemraum: Core / Supporting / Generic |
| **Entity** | Türkis | Identität über die Zeit |
| **Value Object** | Cyan | Wert ohne Identität |
| **Aggregate** | Gelbes Rechteck | Konsistenzgrenze (geteilt mit ES) |
| **Domain Service** | Indigo | Fachlogik ohne natürlichen Entity-Sitz |
| **Repository** | Stein | Persistenzzugriff für Aggregate Roots |
| **Factory** | Lime | Komplexe Erzeugung |
| **Domain Event** | Orange | Bedeutsame Zustandsänderung (geteilt) |
| **External System** | Pink | Integration (geteilt) |
| **Notiz / Hotspot** | Creme / Rot | Annotationen (geteilt) |

### BDD / Example Mapping

| Typ | Farbe / Form | Methodische Rolle |
|-----|--------------|-------------------|
| **Rule** | Amber | Geschäftsregel zur Story |
| **Example** | Grün | Konkretes Szenario (Given/When/Then) |
| **Question** | Himmelblau | Offene Spec-Frage |
| **Actor** | Gelb (Pill) | Wer ist betroffen? |
| **Notiz / Hotspot** | Creme / Rot | Annotationen |

### User Story Mapping

| Typ | Farbe / Form | Methodische Rolle |
|-----|--------------|-------------------|
| **Activity** | Blau, breit | Backbone der User Journey |
| **User Task** | Hellblau | Aufgabe unter einer Activity |
| **User Story** | Gelb | Umsetzbare Story |
| **Release** | Rosa, breit | Horizontaler Release-/MVP-Schnitt |
| **Actor** | Gelb (Pill) | Persona / Rolle |
| **Notiz / Hotspot** | Creme / Rot | Annotationen |

### Event Modeling

| Typ | Farbe / Form | Methodische Rolle |
|-----|--------------|-------------------|
| **Slice** | Orange, breit | Vertical Slice (UI→Command→Event→View) |
| **Domain Event / Command / Read Model / UI / Policy / Actor / External System** | wie ES | Bausteine der Timeline |
| **Notiz / Hotspot** | Creme / Rot | Annotationen |

### Pro Element bearbeitbar

- Label, Beschreibung  
- Position und Größe (Ziehen, Anfasser, Zahlen in der rechten Leiste)  
- Zuordnung zu Swimlane / Bounded Context (automatisch bei Umschließung; Rechtsklick weiter möglich)   
- „Wiederkehrend“ (Rechtsklick)  
- **Domain Event / Aggregate:** Event-Schema (Werte-Editor oder Raw-JSON)  
- **Aggregate:** Attribute, Methoden, Invarianten  
- **Entity:** Identitätsfelder, Attribute, Operationen  
- **Value Object:** Attribute/Komponenten, Flag „unveränderlich“  
- **Domain Service:** Operationen, Flag „zustandslos“  
- **Repository:** Aggregate Root, Operationen  
- **Factory:** Erzeugter Typ, Operationen  
- **Hotspot:** Status (offen/gelöst), Priorität (niedrig/mittel/hoch)
- **Notiz:** Hintergrundfarbe (Detailleiste oder Rechtsklick)
- **Subdomain:** Art (Core / Supporting / Generic)
- **Rule:** Kriterien / Hinweise  
- **Example:** Given / When / Then  
- **Question:** Status (offen/geklärt)  
- **User Story:** Persona, MoSCoW-Priorität, Schätzung, Akzeptanzkriterien  
- **Release / Slice:** Ziel; Slice zusätzlich Systeme/Lanes  

> **Hinweis:** Listenfelder (Attribute, Methoden, …) werden in der Detailleiste zeilenweise gepflegt.

---

## 2. Relationen

Elemente lassen sich verbinden (Header **Verbinden**, Pfeil am Sticky oder Rechtsklick → Relation starten).

**Undo/Redo:** Toolbar-Buttons oder ⌘Z / Ctrl+Z (Undo) und ⌘⇧Z / Ctrl+Y (Redo). Drag einer Gruppe zählt als ein Schritt. History wird nicht in `.storm.json` gespeichert.

| Typ | Bedeutung (UI) |
|-----|----------------|
| `triggers` | löst aus |
| `reactsWith` | reagiert mit |
| `informs` | informiert (gestrichelt) |
| `executedBy` | ausgeführt von |
| `invokes` | ruft auf |
| `causal` | verursacht |
| `contains` | enthält |
| `annotates` | annotiert (gestrichelt; Notiz ↔ Sticky) |

Der Relationstyp wird beim Verbinden **heuristisch vorgeschlagen** und kann per Rechtsklick geändert werden. Optionales Label in der Detailleiste.

---

## 3. Canvas & Strukturierung

### Navigation & Auswahl

- **Pan:** Trackpad-Scroll, Leertaste + Ziehen, oder mittlere Maustaste  
- **Zoom:** Pinch / Ctrl+Scroll (⌘+Scroll), ± in der Toolbar (ca. 25 %–250 %)
- **Auswahl:** Klick, Shift+Klick, Rahmen ziehen (Marquee)  
- **Verschieben:** ein Element oder die Mehrfachauswahl  
- **Größe:** acht Anfasser am ausgewählten Element  
- **Ausrichten:** Rechtsklick bei ≥2 Elementen (links/mitte/rechts, oben/mitte/unten, verteilen, gleiche Breite/Höhe)  
- **Anlegen:** Doppelklick auf leere Fläche, Rechtsklick → Element hinzufügen, oder **1–9/0** (Typ) + **Enter/A** (Viewport-Mitte)  
- **Titel:** Doppelklick auf ein Sticky → Inline-Bearbeitung (Enter speichern, Esc abbrechen; Notizen: ⌘/Ctrl+Enter)  
- **Aktionen:** Rechtsklick-Context-Menü (Löschen, Zuordnung, Hotspot-Status, Hilfe, …)

### Timeline

- Sichtbar/unsichtbar (Header **Timeline**)  
- Vertikal verschiebbar  
- Start-/Ende-Labels (Rechtsklick)  
- Optional **Snap T**: Elemente rasten an der Timeline-Höhe ein  

Methodisch: chronologische Achse links → rechts für Domain Events.

### Swimlanes

- Anlegen über Toolbar  
- Verschieben und in der Größe ändern (wie Bounded Contexts)  
- Elemente werden **automatisch zugeordnet**, wenn sie vollständig in der Lane liegen (und wieder entfernt, wenn nicht mehr vollständig drin)  
- Manuelle Zuordnung weiterhin per Rechtsklick möglich  

Methodisch: parallele Akteure / Streams / Verantwortlichkeiten.

### Bounded Contexts

- Rechteck auf der Fläche zeichnen („Bounded Context“-Modus)  
- Verschieben, skalieren, Label, Zweck, Farbe  
- Elemente werden **automatisch zugeordnet** bei vollständiger Umschließung (bei überlappenden BCs: der kleinste)  
- Manuelle Zuordnung weiterhin per Rechtsklick  
- **Context Map:** Toolbar-Button → zwei BCs anklicken; Muster (ACL, Shared Kernel, Customer/Supplier, …) per Rechtsklick auf die Linie  

Methodisch: Cluster nach Sprache und Verantwortung; Context-Map-Muster modellieren die Schnittstellen zwischen Contexts.

---

## 4. Methoden-Modi, Facilitator & Workshop-Formate

In der Toolbar: **ES | DDD | BDD | USM | EM**. Der Modus steuert Palette und Facilitator-Formate — nicht den Board-Inhalt.

### Event Storming

| Format | Fokus |
|--------|--------|
| **Frei** | Alle ES-Typen, keine Phasenführung |
| **Big Picture** | Chaotic Exploration → Timeline → Konsistenz → Commands/Actors → Policies/Read Models → Bounded Contexts → Hotspots → Wrap-Up |
| **Process Modeling** | Commands & Policies → Pivotal Events → Contexts verfeinern → Aggregates & Read Models |
| **Software Design** | Aggregate Design → Event Schemas → Repository & Service |

### Domain-Driven Design

| Format | Fokus |
|--------|--------|
| **Frei** | Alle DDD-Typen, keine Phasenführung |
| **Strategic Design** | Subdomains → Ubiquitous Language → Bounded Contexts → Context Map → Wrap-Up |
| **Tactical Design** | Aggregates & Entities → Value Objects → Services & Factories → Repositories → Domain Events → Wrap-Up |

### BDD / Example Mapping

| Format | Fokus |
|--------|--------|
| **Frei** | Rules, Examples, Questions, … |
| **Example Mapping** | Story & Rules → Examples → Questions → Wrap-Up |

### User Story Mapping

| Format | Fokus |
|--------|--------|
| **Frei** | Activities, Tasks, Stories, Releases |
| **Story Mapping** | Backbone → Tasks → Stories → Releases |

### Event Modeling

| Format | Fokus |
|--------|--------|
| **Frei** | Slice + ES-Bausteine |
| **Event Modeling** | Events → Commands & UI → Views & Automation → Vertical Slices |

Im Facilitator-Modus:

- Palette auf **erlaubte Typen der Phase** (im aktuellen Modus) begrenzt  
- Checkliste, empfohlene Dauer, Phasenwechsel  
- Hilfe-Dialoge zu Elementen, Relationen und Phasen  

---

## 5. Sprache, Hotspots, Validierung

| Funktion | Inhalt |
|----------|--------|
| **Glossary** | Begriffe + Definitionen (Ubiquitous Language), Markdown-Export |
| **Hotspot-Liste** | Übersicht aller Hotspots, Klick selektiert; Status/Priorität sichtbar |
| **Validierung** | Hinweise am ausgewählten Element (z. B. Past Tense bei Events, isolierte Elemente, Hotspot ohne Beschreibung) — soft, nicht blockierend |
| **Hilfe** | Kontextbezogene Erklärungen (Palette, Sidebar, Rechtsklick, Facilitator) |

---

## 6. Persistenz & Export

### Arbeitsdatei

- Primär: lokale `.storm.json` (File System Access API, wo verfügbar)  
- Alternativen: Datei öffnen / JSON einfügen (bei Konflikt: Dialog)  
- Auto-Speichern, Konfliktbehandlung bei externer Änderung  
- Während **Kollaboration** ist Auto-Save pausiert; beim Verlassen: speichern / Datei laden / weiter  
- PWA / offline-fähig (Serwist)

### Export

| Format | Nutzen |
|--------|--------|
| **JSON** | Vollständiger Board-Stand inkl. Schema-Verweis |
| **JSON Schema** | Für andere Tools, die gültige Boards erzeugen |
| **SVG / PNG** | Visueller Snapshot |
| **Hotspot-Report (MD)** | Offene Punkte |
| **Glossary (MD)** | Ubiquitous Language |
| **Context Map (MD)** | Contexts + Context-Map-Muster + Cross-Boundary-Element-Relationen |
| **Event Catalog (MD)** | Domain Events inkl. Schema |

Schema & Formatdoku: [`docs/BOARD-JSON-SCHEMA.md`](docs/BOARD-JSON-SCHEMA.md), [`public/schemas/board-snapshot-v1.schema.json`](public/schemas/board-snapshot-v1.schema.json).

---

## 7. Darstellung

Unter **Daten → Darstellung**:

- Farbe **Arbeitsbereich** (Canvas)  
- Farbe **Seitenleisten** / Docks  
- Presets (Waypoints, Mitternacht, Workshop hell, Papier)  

Sticky-Farben bleiben methodisch fix (Event-Storming-Konvention). Einstellungen werden im Board-JSON mitgespeichert.

---

## Abgleich: Event-Storming-Aspekte vs. E2

Legende: ✅ vorhanden · 🟡 teilweise · ❌ fehlt / bewusst nicht

### Big Picture / Discovery

| Aspekt | Status | In E2 |
|--------|--------|--------|
| Domain Events sammeln (Chaotic Exploration) | ✅ | Orange Stickies, Facilitator-Phase |
| Past Tense / Event-Formulierung | 🟡 | Hilfe + Soft-Validierung |
| Chronologische Timeline | ✅ | Timeline + Snap |
| Parallele Ströme | ✅ | Swimlanes (Auto-Zuordnung bei Umschließung) |
| Commands | ✅ | Blaue Stickies |
| Actors / Personas | ✅ | Actor-Stickies |
| Policies | ✅ | Lila Stickies |
| Read Models / Views | ✅ | Grün + UI-Typ |
| External Systems | ✅ | Pink Stickies |
| Hotspots / offene Fragen | ✅ | Typ + Liste + Status/Priorität |
| Pivotal Events | ✅ | Eigener Typ + Process-Modeling-Phasen |
| Bounded Contexts erkennen/clustern | ✅ | Zeichnen, benennen, zuordnen |
| Quantität vor Qualität (viele Stickies) | ✅ | Freies Anlegen, keine künstlichen Limits |

### Process Modeling

| Aspekt | Status | In E2 |
|--------|--------|--------|
| Feiner Prozess entlang der Timeline | ✅ | Canvas + Process-Modeling-Format |
| Policies zwischen Events und Commands | ✅ | Typ + Relation `reactsWith` |
| Pivotal Events als Phasengrenzen | ✅ | Typ + Facilitator-Checklisten |
| Swimlanes für Akteure/Systeme | ✅ | Auto-Zuordnung bei vollständiger Umschließung |

### Software Design / DDD-Anschluss

| Aspekt | Status | In E2 |
|--------|--------|--------|
| Aggregates | ✅ | Typ + Methoden + Schema-Felder |
| Event Schemas | ✅ | JSON am Event/Aggregate + Event-Catalog-Export |
| Aggregate-Invarianten | ✅ | Detailleiste (eine Zeile pro Invariante) + Soft-Hint |
| Context Map (visuell) | ✅ | BC-Boxen + Context-Map-Linien + Markdown-Report |
| Context-Map-Muster (ACL, Shared Kernel, Customer/Supplier, …) | ✅ | BC↔BC-Relationen, Muster-Menü, Styles |
| Ubiquitous Language | 🟡 | Glossary; keine Bindung an Sticky-Labels |
| Microservice-/Modul-Schnitt | 🟡 | Über BC-Cluster und Cross-Boundary-Report |

### Workshop-Praxis

| Aspekt | Status | In E2 |
|--------|--------|--------|
| Phasenführung / Facilitator | ✅ | Drei Formate + Checklisten |
| Typbeschränkung pro Phase | ✅ | Palette gefiltert |
| Empfohlene Zeitfenster | ✅ | Phasen-Countdown Start/Pause/Reset im Facilitator |
| Mehrbenutzer / Echtzeit-Kollaboration | ✅ | Optionaler Raum (Supabase); Join-Bestätigung, Datei pausiert, Leave-Optionen |
| Undo/Redo | ✅ | History-Stack, Toolbar, ⌘Z / Ctrl+Z |
| Papier-Workshop-Extras (Opportunity, Problem, Value Stream overlays) | ❌ | Nur die 10 Kern-Typen |

### Tooling / Übergabe

| Aspekt | Status | In E2 |
|--------|--------|--------|
| Lokale Persistenz | ✅ | `.storm.json` |
| Austauschbares Format | ✅ | Schema + `$schema` |
| Bild-/Report-Export | ✅ | SVG, PNG, mehrere MD-Reports |
| Miro-Direktimport | ❌ | Kein natives Miro-Format (CSV/Paste möglich außerhalb) |

---

## Bedienung (Kurz)

1. Arbeitsdatei unter **Daten** anlegen oder öffnen.  
2. Elementtyp in der linken Palette wählen → **Doppelklick** auf die Fläche — oder **1–9/0** für Typ und **Enter/A** für Anlegen in der Viewport-Mitte.  
3. Relationen: **Verbinden** oder Pfeil am Sticky.  
4. Struktur: Timeline, Swimlanes, Bounded Contexts.  
5. Feinschliff: Rechtsklick-Menü; Text/Schema/Invarianten in der rechten Leiste.  
6. Optional Facilitator-Format einschalten (inkl. Phasen-Timer).  
7. Export über **Daten**.

---

## GitHub Pages

Siehe [`docs/GITHUB-PAGES.md`](docs/GITHUB-PAGES.md).

```bash
npm run build:static
npx serve out
# → http://localhost:3000/E2/
```

## Entwicklung

```bash
npm install
npm run dev
npm run test:run
```

## Tech Stack

Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Serwist (PWA).  
Persistenz-Muster angelehnt an [T2](https://github.com/abx-git/T2).

---

## Fazit zur Methodik-Abdeckung

E2 deckt den **Kern von Event Storming** ab: alle gängigen Sticky-Typen, Relationen, Timeline, Swimlanes, Bounded Contexts, Hotspots, Glossary sowie geführte Workshop-Phasen (Big Picture → Process → Design) inklusive Soft-Validierung und Exporten für Übergabe.

**Bewusst oder noch schwach:** Echtzeit-Kollaboration (optional via Supabase — siehe [`docs/COLLABORATION.md`](docs/COLLABORATION.md)); räumliche Zuordnung zu Lanes/Contexts erfolgt jetzt automatisch bei vollständiger Umschließung.

Wenn du Lücken priorisieren willst, sind die methodisch größten Hebel typischerweise: **Glossary-Bindung** und Auto-Zuordnung.
