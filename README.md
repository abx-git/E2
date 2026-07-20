# E2 — Event Storming Tool

Browserbasiertes Event-Storming-Board mit lokaler JSON-Persistenz (`.storm.json`).  
Kein Server für Domänendaten — die Arbeitsdatei liegt beim Nutzer.

**Live:** [abx-git.github.io/E2](https://abx-git.github.io/E2/)  
**Repository:** [github.com/abx-git/E2](https://github.com/abx-git/E2)

---

## Zweck dieses Dokuments

Diese README beschreibt die **implementierten Funktionen** und stellt sie den **klassischen Aspekten von Event Storming** (Brandolini u. a.) gegenüber. Damit lässt sich prüfen, welche Workshop-Bausteine abgedeckt sind und wo Lücken bleiben.

---

## Kurzüberblick

| Bereich | Inhalt |
|--------|--------|
| Sticky-Typen | Alle 10 Event-Storming-Elemente + freie Notizen |
| Relationen | 8 Verbindungstypen inkl. Auto-Vorschlag |
| Fläche | Timeline, Swimlanes, Bounded Contexts, Pan/Zoom |
| Workshop | Big Picture, Process Modeling, Software Design + Frei |
| Sprache | Glossary (Ubiquitous Language) |
| Unsicherheit | Hotspots inkl. Status/Priorität |
| I/O | `.storm.json` + Schema, SVG/PNG, Markdown-Reports |
| UX | Mehrfachauswahl, Ausrichten, Rechtsklick-Menüs, Farben |

---

## 1. Elementtypen (Stickies)

Alle Typen sind in der Palette wählbar (im Facilitator-Modus phasenweise eingeschränkt).

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
| **Notiz** | Creme, gestrichelt | Freie Annotation (Workshop-Hinweis) |
| **Hotspot** | Rot, gedreht | Offene Frage, Konflikt, Unklarheit |
| **Pivotal Event** | Breiter gelber Block | Phasenwechsel / signifikanter Einschnitt |

### Pro Element bearbeitbar

- Label, Beschreibung  
- Position und Größe (Ziehen, Anfasser, Zahlen in der rechten Leiste)  
- Zuordnung zu Swimlane / Bounded Context (Rechtsklick)  
- „Wiederkehrend“ (Rechtsklick)  
- **Domain Event / Aggregate:** Event-Schema (Werte-Editor oder Raw-JSON)  
- **Aggregate:** Methodenliste  
- **Hotspot:** Status (offen/gelöst), Priorität (niedrig/mittel/hoch)

> **Hinweis:** Aggregate-Methoden und -Invarianten lassen sich in der Detailleiste pflegen (eine Zeile pro Eintrag).

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

- **Pan:** mittlere Maustaste oder Leertaste + Ziehen  
- **Zoom:** Mausrad, ± in der Toolbar (ca. 25 %–250 %)  
- **Auswahl:** Klick, Shift+Klick, Rahmen ziehen (Marquee)  
- **Verschieben:** ein Element oder die Mehrfachauswahl  
- **Größe:** acht Anfasser am ausgewählten Element  
- **Ausrichten:** Rechtsklick bei ≥2 Elementen (links/mitte/rechts, oben/mitte/unten, verteilen, gleiche Breite/Höhe)  
- **Anlegen:** Doppelklick, Rechtsklick → Element hinzufügen, oder **1–9/0** (Typ) + **Enter/A** (Viewport-Mitte)  
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
- Elemente manuell zuordnen (Rechtsklick)  

Methodisch: parallele Akteure / Streams / Verantwortlichkeiten.

### Bounded Contexts

- Rechteck auf der Fläche zeichnen („Bounded Context“-Modus)  
- Verschieben, skalieren, Label, Zweck, Farbe  
- Elemente manuell zuordnen  
- **Context Map:** Toolbar-Button → zwei BCs anklicken; Muster (ACL, Shared Kernel, Customer/Supplier, …) per Rechtsklick auf die Linie  

Methodisch: Cluster nach Sprache und Verantwortung; Context-Map-Muster modellieren die Schnittstellen zwischen Contexts.

---

## 4. Facilitator & Workshop-Formate

| Format | Fokus |
|--------|--------|
| **Frei** | Alle Typen, keine Phasenführung |
| **Big Picture** | Chaotic Exploration → Timeline → Konsistenz → Commands/Actors → Policies/Read Models → Bounded Contexts → Hotspots → Wrap-Up |
| **Process Modeling** | Commands & Policies → Pivotal Events → Contexts verfeinern → Aggregates & Read Models |
| **Software Design** | Aggregate Design → Event Schemas → Repository & Service |

Im Facilitator-Modus:

- Palette auf **erlaubte Typen der Phase** begrenzt  
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
- Alternativen: Datei öffnen / JSON einfügen  
- Auto-Speichern, Konfliktbehandlung bei externer Änderung  
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
| Parallele Ströme | 🟡 | Swimlanes (manuelle Zuordnung) |
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
| Swimlanes für Akteure/Systeme | 🟡 | Vorhanden, keine Auto-Erkennung |

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
| Mehrbenutzer / Echtzeit-Kollaboration | 🟡 | Optionaler Raum-Modus (Supabase Free); Solo bleibt Default |
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

**Bewusst oder noch schwach:** Echtzeit-Kollaboration (optional via Supabase — siehe [`docs/COLLABORATION.md`](docs/COLLABORATION.md)) und automatische räumliche Zuordnung zu Lanes/Contexts.

Wenn du Lücken priorisieren willst, sind die methodisch größten Hebel typischerweise: **Glossary-Bindung** und Auto-Zuordnung.
