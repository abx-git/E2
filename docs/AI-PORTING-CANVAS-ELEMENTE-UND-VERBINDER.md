# E2 — Canvas-Elemente & Verbinder (KI-Porting-Referenz)

**Zweck:** Diese Datei beschreibt die **fachliche Funktion** und **technische Implementierung** der E2-App (Event-Storming-/Domain-Modeling-Board) für Canvas-**Elemente** (Stickies) und **Verbinder** (Connectors). Sie dient als **einzelner Input** für eine KI oder ein Team, das dieselbe Funktionalität in einem anderen Projekt nachbauen soll.

**Quell-Repository:** [github.com/abx-git/E2](https://github.com/abx-git/E2)  
**Live:** [abx-git.github.io/E2](https://abx-git.github.io/E2/)  
**Persistenz-Schema:** `public/schemas/board-snapshot-v2.schema.json`  
**Tech-Stack:** Next.js 15, React 19, TypeScript, Zustand (`storm-board-store`), SVG-Canvas, Tailwind.

---

## 1. Architekturüberblick

### 1.1 Konzepte

| Konzept | Beschreibung |
|--------|----------------|
| **Board / Arbeitsdatei** | Ein Dokument (`.storm.json`, Format `event-storming-tool` v2) mit **mehreren Sichten** (`views[]`, Tabs). |
| **Sicht (View)** | Eigenes Diagramm: `elements`, `relations`, `contextRelations`, `canvasLines`, `swimlanes`, `boundedContexts`, `timeline`, `viewport`, `modelingMode`, … |
| **Modeling Mode** | Steuert **Palette** und **Facilitator**, nicht den sichtbaren Board-Inhalt. Typen dürfen gemischt werden. |
| **StormElement** | Sticky auf dem Canvas (Position, Größe, Typ, Label, `metadata`). |
| **Regionen** | `Swimlane`, `BoundedContext` — Rechtecke auf der Fläche; **Aggregate** / **Subdomain** sind Stickies mit Containment-Logik. |
| **Connector (Runtime)** | Vereinheitlichtes Modell `BoardConnector[]` im Store; beim Speichern in Legacy-Arrays aufgeteilt. |

### 1.2 State & Schichten

```
.storm.json (persistiert)
  └── views[].{ elements, relations, contextRelations, canvasLines, … }
        ↓ Import / mergeLegacyIntoConnectors
Zustand Store: connectors: BoardConnector[]
        ↓ resolveConnectorAnchors + SVG
UI: board-connectors.tsx, context-map-connectors.tsx (Legacy-Pfad), canvas-lines
```

**Wichtige Module:**

| Bereich | Datei(en) |
|---------|-----------|
| Element-Typen & Modi | `src/types/storm-element.ts` |
| Relationen / Context Map | `src/types/storm-relation.ts` |
| Connector-Typ | `src/types/board-connector.ts` |
| Store (CRUD, Modi) | `src/store/storm-board-store.ts` |
| Legacy ↔ Connector | `src/lib/board-connector-migrate.ts` |
| Anker-Geometrie | `src/lib/connector-geometry.ts`, `src/lib/board-connector-resolve.ts` |
| Snap / Hit-Test Ziele | `src/lib/connector-target-pick.ts` |
| Relation-Heuristik | `src/lib/relation-validation.ts` → `defaultRelationType` |
| Linien-Stil | `src/lib/connector-style.ts`, `src/lib/board-connector-style.ts` |
| Containment (Lane/BC/Agg/Sub) | `src/lib/region-containment.ts` |
| Visuelle Sticky-Styles | `src/lib/element-styles.ts` |
| Rendering Verbinder | `src/components/board-connectors.tsx` |

### 1.3 Koordinatensystem

- **Weltkoordinaten:** `x`, `y` oben links des Elements; `width`/`height` optional (Defaults aus `element-styles`).
- **Viewport:** `viewport: { x, y, zoom }` — Pan/Zoom transformiert Canvas-Inhalt.
- **zIndex:** Stickies und Regionen haben optional `zIndex` (höher = vorne). Verbinder-Layer liegt **unter** Stickies (`CONNECTOR_LAYER_Z = 10`).

---

## 2. Modeling Modes & Paletten

`ModelingMode` (`src/types/storm-element.ts`):

`eventStorming` | `domainDrivenDesign` | `bdd` | `userStoryMapping` | `eventModeling` | `processFlow` | `dataModel` | `c4` | `arc42` | `cloud` | `freeform`

Jeder Modus hat:

- `ELEMENT_TYPES_BY_MODE` — Reihenfolge in der Palette
- `WORKSHOP_FORMATS_BY_MODE` — Facilitator-Formate
- `DEFAULT_PALETTE_BY_MODE` — Standard-Typ beim Anlegen

**Geteilte Annotationen** (in fast allen Paletten am Ende): `note`, `instruction`, `hotspot`, `link` — siehe `SHARED_ELEMENT_TYPES`.

**Freiform:** `customCard` + pro-Sicht `customCardTypes[]` (Stereotyp, Farbe, Label).

---

## 3. Canvas-Elemente (StormElement)

### 3.1 Kern-Datenmodell

```typescript
interface StormElement {
  id: string;
  type: ElementType;
  label: string;
  description?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;       // z. B. hotspot: 45°
  zIndex?: number;
  swimlaneId?: string;
  boundedContextId?: string;
  aggregateId?: string;      // geometrisches Containment in Aggregate-Sticky
  subdomainId?: string;    // geometrisches Containment in Subdomain-Sticky
  detailViewId?: string;   // Drill-down zu verlinkter Sicht (Architektur)
  metadata?: ElementMetadata;
}
```

**IDs:** `generateStormId()` (`src/lib/storm-id.ts`) — beim Portieren: stabile UUIDs oder kurze IDs, konsistent in Relationen referenzieren.

### 3.2 ElementType — vollständige Liste & methodische Rolle

#### Event Storming (`ES_ELEMENT_TYPES`)

| `type` | Rolle | Form/Größe (Default) |
|--------|--------|----------------------|
| `domainEvent` | Vergangenheits-Event („Was ist passiert?“) | rounded 160×72, orange |
| `pivotalEvent` | Phasen-/Meilenstein-Event | wide 280×48, amber |
| `command` | Auslöser / Intent | rounded 150×68, blau |
| `actor` | Wer führt aus? | pill 110×48, gelb |
| `policy` | When X then Y | rounded 170×72, fuchsia |
| `readModel` | Information für Entscheidungen | rounded 150×68, grün |
| `externalSystem` | Integration außerhalb | rectangle 160×72, pink |
| `aggregate` | Konsistenzgrenze (großes Rechteck) | rectangle 280×200, gelb |
| `ui` | Screen/View | rounded 130×60, slate |

#### Domain-Driven Design (`DDD_ELEMENT_TYPES`)

| `type` | Rolle |
|--------|--------|
| `subdomain` | Core / Supporting / Generic (`metadata.subdomainKind`) |
| `entity` | Identität, `identityFields`, `attributes`, `operations` |
| `valueObject` | Wert ohne Identität, `immutable` |
| `aggregate` | wie ES |
| `domainEvent` | wie ES |
| `domainService` | `operations`, `stateless` |
| `factory` | `createsRef`, `operations` |
| `repository` | `aggregateRootRef`, `operations` |
| `externalSystem` | wie ES |

#### BDD (`BDD_ELEMENT_TYPES`)

| `type` | Rolle | Metadata |
|--------|--------|----------|
| `rule` | Geschäftsregel | `ruleCriteria[]` |
| `example` | Szenario | `exampleGiven/When/Then[]` |
| `question` | Offene Frage | `questionStatus` |
| `actor` | Betroffene Rolle | — |

#### User Story Mapping (`USM_ELEMENT_TYPES`)

| `type` | Rolle | Metadata |
|--------|--------|----------|
| `activity` | Journey-Backbone | — |
| `userTask` | Aufgabe | — |
| `userStory` | Story | `storyPersona`, `storyPriority` (MoSCoW), `storyEstimate`, `storyAcceptance[]` |
| `release` | MVP-Schnitt | `releaseGoal` |
| `actor` | Persona | — |

#### Event Modeling (`EM_ELEMENT_TYPES`)

| `type` | Rolle |
|--------|--------|
| `slice` | Vertical Slice | `sliceSystems[]` |
| + ES-Bausteine | `domainEvent`, `command`, `ui`, `readModel`, `policy`, `actor`, `externalSystem` |

#### Prozess BPMN-lite (`PROCESS_ELEMENT_TYPES`)

| `type` | Rolle | Metadata |
|--------|--------|----------|
| `processStart` | Beginn | `processTrigger` |
| `processActivity` | Schritt | `processRole`, `processSystem`, `processInputs/Outputs[]`, `processDuration` |
| `processGateway` | Verzweigung | `gatewayKind`: xor \| and \| or, `gatewayConditions[]` |
| `processEnd` | Ende | `processResult` |

#### Daten ER-lite (`DATA_ELEMENT_TYPES`)

| `type` | Rolle | Metadata |
|--------|--------|----------|
| `dataEntity` | Entität/Tabelle | `dataTableName`, `identityFields`, `attributes`, `dataUniqueKeys[]` |
| `dataAssociation` | Beziehung | `dataCardinality`, `dataLeftEntity`, `dataRightEntity` |

#### C4 (`C4_ELEMENT_TYPES`)

| `type` | Rolle | Drill-down |
|--------|--------|------------|
| `c4Person` | Person | — |
| `c4SoftwareSystem` | System | `detailViewId` |
| `c4Container` | Container | `detailViewId`, `metadata.c4Technology` |
| `c4Component` | Komponente | `metadata.c4Technology` |
| `archWhitebox` | Scope für Zoom | `detailViewId` |

#### arc42 Bausteinsicht (`ARC42_ELEMENT_TYPES`)

| `type` | Rolle |
|--------|--------|
| `archBlackbox` | Blackbox | `detailViewId` |
| `archWhitebox` | Whitebox | `detailViewId` |
| `archComponent` | Komponente | — |

#### Cloud (`CLOUD_ELEMENT_TYPES`)

`cloudBoundary` (Drill-down), `cloudCompute`, `cloudEdge`, `cloudDataStore`, `cloudMessaging`, `cloudNetwork`, `cloudIdentity`, `cloudManagedService` — optional `metadata.cloudProvider`.

#### Geteilte Annotationen

| `type` | Rolle | Besonderes |
|--------|--------|------------|
| `note` | Freitext | `noteColor`, gestrichelter Rand, multiline |
| `instruction` | Umsetzungsanweisung | Teal, Badge |
| `hotspot` | Unklarheit/Konflikt | `hotspotStatus`, `hotspotPriority`, Rotation 45° |
| `link` | URL oder Sicht | `linkKind`: external \| view, `linkUrl` / `linkViewId` |
| `customCard` | Freiform-Stereotyp | `metadata.customTypeId` → `customCardTypes` |

### 3.3 ElementMetadata (Auszug — vollständig in `storm-element.ts`)

Gemeinsam für viele Typen:

- `progressMark`: `ok` | `attention` | `question` | `working` | `neu` (Shortcuts Ctrl+1–5)
- `webLinks[]`: `{ url, title? }`
- `showDescriptionOnCard`, `showAttributesOnCard`, `showMethodsOnCard`, `showWebLinksOnCard`
- ES/DDD: `eventSchema`, `aggregateMethods`, `aggregateInvariants`, `isRecurring`

**Visuelles Rendering:** `styleForElementType(type)` / `ELEMENT_STYLES` in `src/lib/element-styles.ts` — pro Typ: `fill`, `stroke`, `ink`, `shape`, `defaultWidth/Height`, Tailwind-Klassen.

**Moduswechsel:** Elemente anderer Methode werden mit **gestricheltem Rahmen** abgesetzt (UI-Hinweis, Typ bleibt erhalten).

### 3.4 Regionen & Containment

#### Swimlane & BoundedContext (eigene Arrays, nicht `StormElement`)

```typescript
interface Swimlane {
  id, label, x, y, width, height;
  color?, fillOpacity?, borderColor?, borderOpacity?, locked?, zIndex?;
}
interface BoundedContext {
  id, label, purpose?, x, y, width, height;
  color?, …; detailViewId?;  // verlinkte Detail-Sicht
}
```

**Automatische Zuordnung** (`applyContainmentAssignments` in `region-containment.ts`):

1. Element-Rechteck muss **vollständig** in Region liegen (`rectFullyContains`).
2. Bei mehreren passenden Regionen: **kleinste Fläche** gewinnt (verschachtelte BCs/Lanes).
3. Felder: `swimlaneId`, `boundedContextId`, `aggregateId`, `subdomainId`.

**Aggregate / Subdomain:** Große Stickies vom Typ `aggregate` / `subdomain`; andere Elemente erhalten `aggregateId` / `subdomainId` bei vollständiger geometrischer Enthaltung. Aggregate nesten nicht in Aggregate; Subdomains nicht in Subdomains.

**Mitbewegen:** Beim Verschieben einer Lane/BC/Aggregate/Subdomain werden alle zugeordneten oder vollständig enthaltenen Elemente mittransliert (`elementIdsInSwimlane`, `elementIdsInBoundedContext`, …).

#### Timeline

```typescript
interface Timeline {
  y: number;
  startLabel?, endLabel?, visible?;
}
```

Snap optional (`snapToTimeline`): Element-`y` wird an `timeline.y` ausgerichtet. Methodisch: chronologische Achse für Events.

### 3.5 Canvas-Interaktionen (Elemente)

| Aktion | Verhalten |
|--------|-----------|
| Anlegen | Palette, Doppelklick Leerfläche, Kontextmenü, Tastatur 1–9/0 + Enter |
| Verschieben | Drag; Mehrfachauswahl |
| Größe | 8 Resize-Handles |
| Text | Doppelklick Inline-Edit |
| Zuordnung | Auto-Containment + manuell per Kontextmenü |
| Suche | Dimmt Nicht-Treffer; Verbinder zu Treffern bleiben sichtbar |
| Drill-down | Arch-Typen mit `detailViewId` → Tab/Sicht wechseln |

**Soft-Validierung** (`validateBoard`): Past Tense bei Events, isolierte Elemente, Hotspot ohne Beschreibung, Cross-BC-Relation ohne Context-Map, Command rechts vom Event, etc.

---

## 4. Verbinder (Connectors)

### 4.1 Vereinheitlichtes Modell `BoardConnector`

```typescript
type ConnectorEndpoint =
  | { attach: "element"; id: string; approach?: { x, y } }  // approach legacy, wird ignoriert
  | { attach: "boundedContext"; id: string; approach?: … }
  | { attach: "swimlane"; id: string; approach?: … }
  | { attach: "point"; x: number; y: number };

interface BoardConnector {
  id: string;
  source: ConnectorEndpoint;
  target: ConnectorEndpoint;
  arrowHead?: "none" | "start" | "end" | "both";  // Default "end"
  label?: string;
  labelMode?: "type" | "custom";   // Sticky-Relationen
  relationType?: RelationType;       // nur element↔element
  contextMapPattern?: ContextMapPattern;  // nur BC↔BC
  strokeStyle?: "solid" | "dashed" | "dotted";
  color?: string;                    // v. a. freie Linien
  progressMark?: ProgressMark;
}
```

**Drei fachliche Connector-Arten** (intern ein Array, Unterscheidung über Endpunkte + Felder):

| Art | Endpunkte | Felder | Legacy-Persistenz |
|-----|-----------|--------|-------------------|
| **Sticky-Relation** | `element` ↔ `element` | `relationType`, `label`, `labelMode`, `strokeStyle` | `relations[]` → `StormRelation` |
| **Context Map** | `boundedContext` ↔ `boundedContext` | `contextMapPattern`, optional `label` | `contextRelations[]` |
| **Freie Linie** | `point` ↔ `point` | `color`, `strokeStyle`, `arrowHead` | `canvasLines[]` |

Migration: `legacyToConnectors` / `connectorsToLegacy` in `board-connector-migrate.ts`. Beim Laden: wenn `connectors` leer, aus Legacy bauen.

### 4.2 Sticky-Relationen (`RelationType`)

| `relationType` | UI-Label (DE) | Default-Strich |
|----------------|---------------|----------------|
| `triggers` | löst aus | solid |
| `reactsWith` | reagiert mit | solid |
| `informs` | informiert | **dashed** |
| `executedBy` | ausgeführt von | solid |
| `invokes` | ruft auf | solid |
| `causal` | verursacht | solid |
| `contains` | enthält | solid |
| `annotates` | annotiert | **dashed** |

**Beschriftung auf Canvas** (`relationCanvasCaption`):

- `labelMode === "type"` → Typ-Label (z. B. „löst aus“)
- `labelMode === "custom"` → `label` oder leer
- sonst: `label` wenn gesetzt, sonst leer

**Pfeil:** Relationen typischerweise `arrowHead: "end"`.

### 4.3 Heuristik `defaultRelationType(source, target)`

Beim Verbinden zweier Stickies (ohne expliziten Typ) — **exakte Priorität** wie in `src/lib/relation-validation.ts`:

1. `note` / `instruction` / `link` an einer Seite → `annotates`
2. `actor` → `command` → `executedBy`
3. `readModel` → `command` → `informs`
4. `command` → `domainEvent` \| `aggregate` → `triggers`
5. `aggregate` → `domainEvent` → `triggers`
6. `domainEvent` → `policy` → `reactsWith`
7. `policy` → `command` → `reactsWith`
8. `aggregate` → `entity` \| `valueObject` → `contains`
9. `entity` → `valueObject` → `contains`
10. `repository` → `aggregate` → `invokes`
11. `factory` → `aggregate` \| `entity` → `invokes`
12. `domainService` (als Source) → `invokes`
13. `rule` ↔ `example` → `informs`
14. `question` (als Source) → `annotates`
15. `activity` → `userTask` → `contains`
16. `userTask` → `userStory` → `contains`
17. `slice` (als Source) → `informs`
18. Prozess-Typen (`processStart/Activity/Gateway/End`) beteiligt → `causal`
19. `dataEntity` / `dataAssociation` beteiligt → `contains`
20. arc42 / C4 / Cloud-Elementtypen beteiligt → `contains`
21. `externalSystem` (als Source) → `invokes`
22. `domainEvent` → `domainEvent` → `causal`
23. **Fallback:** `triggers`

**Porting-Tipp:** Diese Funktion 1:1 übernehmen oder als Tabelle/Regelengine testen (`relation-validation.cross-context.test.ts`).

### 4.4 Context-Map-Muster (`ContextMapPattern`)

Zwischen **Bounded Contexts** (nicht zwischen Stickies):

| Pattern | Bedeutung (DDD) |
|---------|------------------|
| `partnership` | Partnership |
| `sharedKernel` | Shared Kernel |
| `customerSupplier` | Customer/Supplier (Default bei neuem BC-Link) |
| `conformist` | Conformist |
| `antiCorruptionLayer` | Anti-Corruption Layer |
| `openHostService` | Open-Host Service |
| `publishedLanguage` | Published Language |
| `separateWays` | Separate Ways |

**Visuelle Kodierung** (`board-connector-style.ts` / `CONTEXT_PATTERN_STYLE`):

| Pattern | Stroke | Dash | Width | Doppellinie |
|---------|--------|------|-------|-------------|
| partnership | #2a9d8f | — | 3 | nein |
| sharedKernel | #c9a227 | — | 2.5 | **ja** |
| customerSupplier | #457b9d | — | 2.5 | nein |
| conformist | #6c757d | 8 4 | 2 | nein |
| antiCorruptionLayer | #e76f51 | 4 3 | 2.5 | nein |
| openHostService | #2a9d8f | — | 2.5 | nein |
| publishedLanguage | #264653 | 2 2 | 2 | nein |
| separateWays | #adb5bd | 10 6 | 2 | nein |

Richtung: `sourceContextId` = upstream/supplier, `targetContextId` = downstream/customer (DDD-Konvention in Typenkommentaren).

### 4.5 Geometrie & Rendering

#### Ankerpunkt-Berechnung

Für Shape-Endpunkte (element, BC, swimlane):

1. Mittelpunkt von Source und Target ermitteln (`connectorEndpointCenter`).
2. Linie von Source-Mitte Richtung Target-Mitte; **Schnittpunkt mit Rechteckkante** (`rectAnchorToward` / `rectEdgePoint`).
3. Legacy-Feld `approach` wird **nicht** mehr für Rendering genutzt (`stripConnectorApproach`).

Freie Punkte: exakte `x`,`y`.

**Element-zu-Element (Legacy-Hilfe):** `relationAnchors(sourceEl, targetEl)` in `connector-geometry.ts` — gleiche Logik nur für Element-Rechtecke.

#### Snap beim Zeichnen

`pickConnectorTargetSnapAt(point, elements, swimlanes, boundedContexts, margin=28)`:

- Zuerst innerstes Objekt unter dem Cursor (`pickInnermostConnectorTargetAt`): kleinste **Fläche** unter allen enthaltenen; Tie-Break: `element` > `boundedContext` > `swimlane`, dann `id`.
- Sonst Snap auf erweiterte Bounds (`margin` px).

`prepareConnectorEndpoints`: Endpunkte snappen, dann `defaultRelationType` wenn element↔element.

#### Hit-Testing

`connectorHitStrokeWidth(zoom) = max(16, 18/zoom)` — breite unsichtbare Stroke für Klicks.

#### Z-Order

Verbinder unter Karten; Endpoint-Handles sehr hoch (`CONNECTOR_HANDLE_Z`) für Drag.

### 4.6 Benutzer-Workflows Verbinder

| Modus | Store-Flags | Ablauf |
|-------|-------------|--------|
| **Relation verbinden** | `relationMode`, `relationDraftSourceId` / `connectorDraftSource` | Klick Source → Klick Target; oder Pfeil-Handle am Sticky |
| **Context Map** | `contextMapMode`, `contextMapDraftSourceId` | Zwei BCs wählen; schließt `relationMode` aus |
| **Freie Linie** | `lineDrawMode` | Shift+Drag auf leerem Canvas (`shouldStartConnectorLineDraw`) |
| **Endpoint ziehen** | — | Handle an Connector-Ende; Reconnect mit Snap-Filter (`SNAP_ACCEPT`: element, boundedContext, swimlane) |

Store-Methoden (Auszug): `addRelation`, `updateRelation`, `removeRelation`, `addConnector`, `updateConnector`, `reconnectConnector`, `addContextRelation`, `reconnectContextRelation`.

**Duplikat-Prüfung:** Gleiche element↔element-Verbindung mit gleichem Typ wird vermieden (Store-Logik bei `addRelation`).

### 4.7 Persistenz JSON (Beispiele)

**StormRelation** (in `views[].relations`):

```json
{
  "id": "rel-1",
  "type": "triggers",
  "sourceId": "cmd-1",
  "targetId": "evt-1",
  "labelMode": "type",
  "strokeStyle": "solid"
}
```

**ContextRelation**:

```json
{
  "id": "ctx-rel-1",
  "type": "antiCorruptionLayer",
  "sourceContextId": "bc-upstream",
  "targetContextId": "bc-downstream",
  "label": "ACL Team A"
}
```

**CanvasLine** (freie Linie):

```json
{
  "id": "line-1",
  "x1": 100, "y1": 200, "x2": 400, "y2": 250,
  "arrowHead": "end",
  "strokeStyle": "dashed",
  "color": "#333333"
}
```

**StormElement** (Minimal):

```json
{
  "id": "evt-1",
  "type": "domainEvent",
  "label": "Order Placed",
  "x": 320,
  "y": 380,
  "boundedContextId": "bc-orders"
}
```

Vollständige Schema-Definitionen: `#/$defs/stormElement`, `stormRelation`, `contextRelation`, `canvasLine` in `board-snapshot-v2.schema.json`.

---

## 5. Implementierungs-Checkliste (Porting)

### 5.1 Minimal viable Board

- [ ] `StormElement` CRUD mit Weltkoordinaten + Default-Größen pro Typ
- [ ] Viewport Pan/Zoom
- [ ] `relations[]` mit `defaultRelationType` + SVG-Linien center→edge
- [ ] Auswahl, Drag, Resize
- [ ] JSON Import/Export kompatibel zu v2-Schema (mindestens `elements` + `relations`)

### 5.2 Parität mit E2 (Canvas + Verbinder)

- [ ] Unified `BoardConnector` im Runtime-State + `connectorsToLegacy` beim Speichern
- [ ] Swimlanes + Bounded Contexts + Containment (`applyContainmentAssignments`)
- [ ] Context-Map-Modus + Muster-Styles + Doppellinie Shared Kernel
- [ ] Freie Linien (`canvasLines` / point endpoints)
- [ ] Endpoint-Reconnect mit Snap (`pickConnectorTargetSnapAt`)
- [ ] `labelMode` / gestrichelte Default-Stile für `informs` und `annotates`
- [ ] `progressMark` auf Elementen und Connectors
- [ ] Soft-Validierung (`validateBoard`)
- [ ] Alle `ElementType` + `metadata`-Felder für gewünschte Modi
- [ ] `element-styles` Farben/Formen für Workshop-Lesbarkeit

### 5.3 Tests im E2-Repo (als Spezifikation nutzen)

- `connector-geometry.test.ts`, `board-connector-resolve.test.ts`
- `connector-target-pick.test.ts`, `connector-style.test.ts`
- `region-containment.test.ts`, `relation-validation.cross-context.test.ts`
- `board-connector-migrate.test.ts`

### 5.4 KI-Roundtrip

E2 exportiert **KI-Pakete** (`ai-board-context-v1`, `src/lib/ai-context-mode-schema.ts`): Schema-URL + Sicht-Daten inkl. Layout. Rückimport: Daten → JSON einfügen (`ai-board-context-import.ts`). Für Porting: gleiche Feldnamen (`elements`, `relations`, `boundedContexts`, …) beibehalten.

---

## 6. Verhalten bei Moduswechsel & gemischten Boards

- **Palette** filtert auf `elementTypesForMode(activeMode)`; Facilitator kann weiter einschränken.
- **Board-Inhalt** bleibt unverändert; fremde Typen visuell markiert.
- **Relationen** sind modusübergreifend gültig; Heuristik nutzt nur Element-`type`, nicht den Modus.
- **Exporte** (Mermaid, MD-Reports) sind modusspezifisch implementiert (`mermaid-diagram.ts`, diverse Export-Module).

---

## 7. Glossar für KI-Prompts

Wenn eine KI Boards **erzeugen** soll:

1. `modelingMode` der Ziel-Sicht setzen.
2. Stickies mit konsistenten `id`s anlegen; Positionen so legen, dass Leserichtung links→rechts für Events sinnvoll ist.
3. Relationen mit `type` gemäß `defaultRelationType` oder explizit; für ES-Flow typisch: `actor`→`command` (`executedBy`), `command`→`domainEvent` (`triggers`), `domainEvent`→`policy` (`reactsWith`), `policy`→`command` (`reactsWith`).
4. Bounded Contexts als Rechtecke; Cross-BC-Element-Relationen nur mit passender `contextRelations`-Kante modellieren.
5. Hotspots für offene Fragen; `note`/`instruction` per `annotates` anbinden.
6. `$schema` auf `https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json` setzen für Validierung.

---

## 8. Version & Kompatibilität

- Datei-Format: `format: "event-storming-tool"`, `version: 2`.
- v1 wird beim Import migriert (einzelne Sicht → `views[]`).
- Runtime-`connectors` optional in zukünftigen Formaten; aktuell Persistenz über `relations` + `contextRelations` + `canvasLines`.
- Beta-Hinweis: Schema kann sich ändern (README).

---

*Erstellt als KI-Porting-Referenz für das E2-Projekt. Stand: Codebasis `event-storming-tool` 0.1.0.*
