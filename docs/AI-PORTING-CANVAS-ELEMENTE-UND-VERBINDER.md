# E2 — Canvas-Elemente & Verbinder (KI-Porting-Referenz)

**Zweck:** Beschreibung der **Funktionsweise**, **UI** und **Implementierung** des E2-Boards für Canvas-**Elemente** (Karten/Stickies) und **Verbinder**. Einzelner Input für eine KI oder ein Team beim Nachbau in einem anderen Projekt.

**Quell-Repository:** [github.com/abx-git/E2](https://github.com/abx-git/E2)  
**Persistenz-Schema:** `public/schemas/board-snapshot-v2.schema.json`  
**Stack:** Next.js 15, React 19, TypeScript, Zustand (`storm-board-store`), SVG + HTML-Layer, Tailwind.

---

## 1. Architektur

### 1.1 Datenfluss

```
.storm.json (persistiert, pro Sicht)
  elements[], relations[], contextRelations[], canvasLines[],
  swimlanes[], boundedContexts[], timeline, viewport, …
        ↓ Laden: mergeLegacyIntoConnectors()
Runtime Store (Zustand)
  elements, swimlanes, boundedContexts, connectors[], viewport, Auswahl, Tool-Modi
        ↓ Rendering
storm-canvas.tsx
  ├── SwimlaneLayer, BoundedContextLayer, TimelineGuide
  ├── BoardConnectors (SVG)
  └── StormElementCard[] (HTML, transformiert)
```

**Einheitliche Verbinder:** Im Store existiert nur `connectors: BoardConnector[]`. Beim Speichern wird per `connectorsToLegacy()` in drei Arrays aufgeteilt; beim Laden wird daraus wieder ein Array gebaut (`src/lib/board-connector-migrate.ts`).

### 1.2 Koordinaten & Viewport

| Konzept | Details |
|---------|---------|
| **Weltkoordinaten** | Origin oben links; Elemente haben `x`, `y`, optionale `width`/`height`. |
| **Default-Größe** | Fehlt `width`/`height` → `element-styles.ts` (`defaultWidth`, `defaultHeight` pro `type`). |
| **Viewport** | `{ x, y, zoom }` — Pan verschiebt `x/y`, Zoom typisch ca. 0.25–2.5. |
| **screenToWorld** | `src/lib/canvas-viewport.ts` — Pointer-Events → Weltpunkte für Snap/Drag. |
| **Snap** | Optional `snapToGrid`, `snapToTimeline` (Y an `timeline.y`). |

### 1.3 Z-Order (Rendering)

- Stickies: `sortElementsByZOrder` + `cssStackingZIndex` (`element-z-order.ts`).
- Verbinder-SVG: **unter** Karten (`CONNECTOR_LAYER_Z = 10` in `board-connectors.tsx`).
- Connector-Endpoint-Handles: sehr hoher z-index (`CONNECTOR_HANDLE_Z = 100_010`), damit sie über selektierten Karten greifbar bleiben.

### 1.4 Modul-Landkarte

| Thema | Dateien |
|-------|---------|
| Element-Typ & Metadata | `src/types/storm-element.ts` |
| Relationstypen, Context-Map-Enum | `src/types/storm-relation.ts` |
| Connector-Typ | `src/types/board-connector.ts` |
| Store, Gesten, CRUD | `src/store/storm-board-store.ts` |
| Undo/Redo | `src/lib/board-history.ts` |
| Canvas-Orchestrierung | `src/components/storm-canvas.tsx` |
| Karten-UI | `src/components/storm-element-card.tsx` |
| Verbinder-UI | `src/components/board-connectors.tsx` |
| Regionen-UI | `swimlane-layer.tsx`, `bounded-context-layer.tsx` |
| Looks pro `type` | `src/lib/element-styles.ts` |
| Containment | `src/lib/region-containment.ts` |
| Connector-Geometrie | `connector-geometry.ts`, `board-connector-resolve.ts`, `connector-target-pick.ts` |
| Relation-Vorschlag | `relation-validation.ts` → `defaultRelationType` |
| Linien-Darstellung | `connector-style.ts`, `board-connector-style.ts` |

---

## 2. Datenmodell: Elemente

### 2.1 `StormElement`

```typescript
interface StormElement {
  id: string;
  type: ElementType;           // string-enum, Schlüssel für Styling & Heuristiken
  label: string;
  description?: string;        // Markdown, Detailleiste + optional auf Karte
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;           // Grad; einige Typen haben Default-Rotation im Style
  zIndex?: number;
  swimlaneId?: string;
  boundedContextId?: string;
  aggregateId?: string;        // Containment in Aggregate-Karte (Typ aggregate)
  subdomainId?: string;        // Containment in Subdomain-Karte
  detailViewId?: string;       // Navigation zu anderer Sicht (Drill-down)
  metadata?: ElementMetadata;  // typspezifische Felder, siehe Schema
}
```

**IDs:** `generateStormId()` — bei Import/Porting konsistent in `relations[].sourceId/targetId` referenzieren.

### 2.2 Typen & Darstellung (ohne Methoden-Katalog)

- Jeder `type` ist ein **Konfigurationsschlüssel** in `ELEMENT_STYLES` (`element-styles.ts`): `fill`, `stroke`, `ink`, `shape` (`rounded` | `rectangle` | `pill` | `wide`), Default-Maße, optionale `rotation`.
- **Benutzerdefinierte Typen:** `customCard` + pro-Sicht `customCardTypes[]` (`id`, `label`, Farben) — `metadata.customTypeId` verknüpft Karte mit Definition; `resolveElementStyle()` merged Styles.
- **Metadata:** großes optionales Objekt (`ElementMetadata` in `storm-element.ts`, JSON Schema `elementMetadata`). Die Detailleiste (`element-detail-sidebar.tsx`) zeigt felder abhängig vom `type` (Listen: Attribute, Operationen, Given/When/Then, …).
- **Karten-Vorschau:** `card-preview.ts` entscheidet, ob Beschreibung, Attribute, Methoden, Web-Links auf der Karte gerendert werden (`show*OnCard` in metadata).

### 2.3 Gemeinsame UI-Features auf Karten

| Feature | Daten | UI |
|---------|-------|-----|
| Bearbeitungsstand | `metadata.progressMark` | Badge; Shortcuts Ctrl+1–5 |
| Web-Links | `metadata.webLinks[]` | Liste auf Karte / Sidebar |
| Wiederkehrend | `metadata.isRecurring` | Icon (Uhr) |
| Link-Karte | `linkKind`, `linkUrl` / `linkViewId` | Öffnen per Icon |
| Notiz-Farbe | `metadata.noteColor` | Hintergrund-Preset |
| Hotspot | `hotspotStatus`, `hotspotPriority` | Status in Sidebar/Liste |
| Drill-down | `detailViewId` + `supportsArchDrilldown(type)` | Button → Sicht wechseln |

**Boundary-Karten** (große Rechtecke, halbtransparente Füllung in `storm-element-card.tsx`): u. a. `aggregate`, `subdomain` — dienen als **visuelle Container** und für `aggregateId`/`subdomainId`-Logik.

---

## 3. UI: Canvas-Schichten & Layout

Root: `[data-storm-canvas]` in `storm-canvas.tsx`.

**Zeichenreihenfolge (hinten → vorne):**

1. Hintergrund (Appearance-Farbe)
2. Swimlanes (`SwimlaneLayer`)
3. Bounded Contexts (`BoundedContextLayer`)
4. Timeline (`TimelineGuide`, optional unsichtbar)
5. **SVG:** `BoardConnectors` (alle `BoardConnector` außer rein BC-Context-Map kann auch parallel in Legacy-Komponente — Runtime ist unified)
6. **HTML:** `StormElementCard` pro Element, sortiert nach z-index

**Chrome:** `canvas-board-chrome.tsx` — Werkzeugleiste (Verbinden, Ansicht, Zoom-Buttons), nicht Teil der Welttransform.

### 3.1 Navigation

| Eingabe | Verhalten |
|---------|-----------|
| Trackpad-Scroll / Rad | Pan (`setViewport`) |
| Space + Drag / Mittelklick-Drag | Pan |
| Pinch / Ctrl+Scroll | Zoom um Cursor (`zoomAtPoint`) |
| Leerfläche-Klick | Auswahl leeren (wenn kein Marquee/Pan) |
| Marquee auf Leerfläche | Rechteckauswahl für Elemente, Lanes, BCs |

Panning und Karten-Drag teilen sich Pointer-Logik; Schwellwerte: `MARQUEE_THRESHOLD_PX = 4`, `PAN_MOVE_THRESHOLD_PX = 3`, Karten-Drag `DRAG_THRESHOLD_PX = 6`.

### 3.2 Auswahl

- **Einfach:** Klick auf Karte (`onSelect(id, false)`).
- **Additiv:** Shift+Klick (`additive: true`) → `selectedElementIds`.
- **Marquee:** mehrere IDs in Store.
- Parallel können **ein** Connector (`selectedConnectorId`), **eine** Context-Relation (`selectedContextRelationId`) selektiert sein — Klick auf Canvas/anderes Objekt hebt auf.

**Suche:** `searchQuery` im Store (nicht persistiert) — Nicht-Treffer werden abgedunkelt; Verbinder bleiben sichtbar, wenn Endpunkt ein Treffer ist (`board-connectors.tsx`).

**Fokusmodus:** `focusMode` blendet irrelevante Elemente aus (Store-Filter in Canvas).

---

## 4. UI: Karten-Interaktion (`StormElementCard`)

### 4.1 Anlegen

- Palette links wählt `paletteType` (+ optional `paletteCustomTypeId`).
- **Doppelklick** auf leere Fläche → `addElement(paletteType, worldX, worldY)` mit Snap.
- Kontextmenü (`canvas-context-menu.tsx`): Typ wählen, an Position einfügen.
- Tastatur: Zifferntasten wählen Palette-Slot; Enter/A legt in Viewport-Mitte an.

`addElement` setzt Defaults, bei `customCard` wird `customTypeId` aus Palette übernommen, und ruft nach Positionierung `applyContainmentAssignments` auf.

### 4.2 Verschieben & Gruppieren

- Pointer-Down auf Karte → bei Bewegung > Threshold: Drag.
- **Mehrfachauswahl:** `expandCanvasMoveSet` bestimmt mitbewegte IDs (ausgewählte Elemente + enthaltene Kinder bei Boundary-Karten).
- Beim Verschieben von **Swimlane / BC / Aggregate / Subdomain** werden zugehörige Elemente mittransliert (`elementIdsInSwimlane`, … in `region-containment.ts`).
- Store: `moveCanvasSelection` — ein **Undo-Schritt** für die ganze Gruppe (`beginGesture` / `endGesture`).

### 4.3 Größe & Rotation

- **8 Resize-Handles** an selektierter Karte (`HANDLE_POSITIONS`, `MIN_SIZE = 40`).
- Rotation: Griffe/Shortcuts in Karte; Snap alle 15° (`ROTATION_SNAP_STEP`); `effectiveElementRotation` merged Style-Default und `element.rotation`.

### 4.4 Text bearbeiten

- **Doppelklick** auf Label → Inline `input`/`textarea` (Notiz/Instruction: mehrzeilig, Ctrl+Enter speichern).
- Ausführliche Felder in **rechter Sidebar** (`element-detail-sidebar.tsx`): Label, Beschreibung (MDX-Editor), typspezifische Listen, Position als Zahlen.

### 4.5 Verbinden von der Karte

Props: `relationMode`, `connecting`, `onStartConnect`, `onCompleteConnect`.

- Kleiner **Pfeil-Handle** an der Karte: Start → Zielklick schließt Relation.
- Im `relationMode`: erster Klick auf Karte setzt `connectorDraftSource` / `relationDraftSourceId`, zweiter Klick auf Ziel → `addRelation` bzw. `addConnector` nach `prepareConnectorEndpoints`.

Zielkarten können als **Hint** hervorgehoben werden (`isRelationTargetHint`).

### 4.6 Kontextmenü & Aktionen

Rechtsklick (`canvas-context-menu.tsx`): Löschen, Duplizieren, Zuordnung zu Lane/BC, Relationstyp ändern (wenn Connector selektiert), Ausrichten (≥2 Elemente), Layer (nach vorne/hinten), Progress-Mark, Hotspot-Status, Hilfe.

**Clipboard:** Copy/Cut/Paste mit ID-Remap (`board-clipboard.ts`); `aggregateId`/`subdomainId` nur wenn Container mitkopiert wird.

### 4.7 Touch / Grobe Pointer

`useIsCoarsePointer`: Long-Press (~500 ms) öffnet Kontextmenü; erhöhte Drag-Schwellen.

---

## 5. Regionen & automatische Zuordnung

### 5.1 Swimlane & Bounded Context

Eigene Entitäten (keine `StormElement`s), rechteckig auf dem Canvas:

```typescript
interface Swimlane {
  id, label, x, y, width, height;
  color?, fillOpacity?, borderColor?, borderOpacity?, locked?, zIndex?;
}
interface BoundedContext {
  id, label, purpose?, x, y, width, height;
  color?, …, locked?, zIndex?, detailViewId?;
}
```

**UI:** Zeichnen/Resize analog zu Karten; `locked` verhindert Verschieben/Größe.

### 5.2 Containment-Algorithmus

`applyContainmentAssignments(elements, swimlanes, boundedContexts)`:

1. Bounding-Box der Karte (`elementBounds` in `selection-geometry.ts`).
2. Region muss Karte **vollständig** umschließen (`rectFullyContains`).
3. Mehrere Treffer → Region mit **kleinster Fläche**.
4. Setzt `swimlaneId`, `boundedContextId`, `aggregateId`, `subdomainId`.

Aggregate/Subdomain: nur Elemente vom jeweiligen `type` als Container; kein Selbst-Nesting.

**Manuell:** Kontextmenü kann Zuordnung setzen; nächster Containment-Lauf kann geometrische Lage wieder überschreiben, wenn Karte nicht mehr vollständig inside.

### 5.3 Timeline

Horizontale Hilfslinie bei `timeline.y`; Labels optional. Mit `snapToTimeline`: beim Anlegen/Verschieben wird Y auf Timeline ge snapped (`snapToTimeline()` in viewport-Hilfen).

---

## 6. Verbinder — Funktionsweise

### 6.1 `BoardConnector` & Endpunkte

```typescript
type ConnectorEndpoint =
  | { attach: "element"; id: string; approach?: { x, y } }   // approach: Legacy, Rendering ignoriert
  | { attach: "boundedContext"; id: string; approach?: … }
  | { attach: "swimlane"; id: string; approach?: … }
  | { attach: "point"; x: number; y: number };

interface BoardConnector {
  id: string;
  source: ConnectorEndpoint;
  target: ConnectorEndpoint;
  arrowHead?: "none" | "start" | "end" | "both";
  label?: string;
  labelMode?: "type" | "custom";
  relationType?: RelationType;
  contextMapPattern?: ContextMapPattern;
  strokeStyle?: "solid" | "dashed" | "dotted";
  color?: string;
  progressMark?: ProgressMark;
}
```

**Drei Varianten** (ein Array, Unterscheidung durch Endpunkte + Felder):

| Variante | Endpunkte | Persistenz-Feld |
|----------|-----------|-----------------|
| Element-Relation | `element` ↔ `element` | `relations[]` (`StormRelation`) |
| Context-Map-Kante | `boundedContext` ↔ `boundedContext` | `contextRelations[]` |
| Freie Linie | `point` ↔ `point` | `canvasLines[]` |

### 6.2 Relationstypen (`RelationType`)

| Wert | Anzeige (DE) | Default-Strich |
|------|----------------|----------------|
| `triggers` | löst aus | solid |
| `reactsWith` | reagiert mit | solid |
| `informs` | informiert | dashed |
| `executedBy` | ausgeführt von | solid |
| `invokes` | ruft auf | solid |
| `causal` | verursacht | solid |
| `contains` | enthält | solid |
| `annotates` | annotiert | dashed |

Caption: `relationCanvasCaption` — `labelMode: "type"` zeigt Übersetzung aus `RELATION_TYPE_LABELS`; `"custom"` zeigt `label`.

**Auto-Vorschlag** beim Verbinden zweier Elemente: `defaultRelationType(source, target)` in `relation-validation.ts` (regelbasiert auf `source.type` und `target.type`; Fallback `triggers`). Beim Portieren die Funktion inkl. Tests übernehmen.

### 6.3 Context-Map (`ContextMapPattern`)

Nur zwischen **Bounded Contexts**; Store-Flag `contextMapMode` schließt `relationMode` aus.

Muster: `partnership`, `sharedKernel`, `customerSupplier` (Default neu), `conformist`, `antiCorruptionLayer`, `openHostService`, `publishedLanguage`, `separateWays`.

Darstellung: `board-connector-style.ts` — pro Muster `stroke`, optional `dash`, `width`, `sharedKernel` → **zwei parallele Linien** (`boardConnectorDoubleLine`).

### 6.4 Geometrie (Implementierung)

**Anker (Shape → Shape):**

```
center(source) ──ray──► center(target)
sourceEdge = rect ∩ ray am Source-Rechteck (rectAnchorToward)
targetEdge = rect ∩ ray am Target-Rechteck
```

Implementierung: `resolveConnectorAnchors` → `resolveConnectorEndpointPoint` + `connectorEndpointCenter` (`board-connector-resolve.ts`). Rechteck-Logik auch in `relationAnchors` für reine Element-Paare (`connector-geometry.ts`).

**Freie Punkte:** Koordinaten unverändert.

**Snap beim Erstellen/Ziehen:** `pickConnectorTargetSnapAt(worldPoint, …, margin=28)` — innerstes Objekt unter Cursor (kleinste Fläche; Priorität `element` > `boundedContext` > `swimlane`), sonst erweiterte Hit-Box.

**Neuer Connector:** `prepareConnectorEndpoints` → snap + `stripConnectorApproach` + `inferConnectorSemantics` + ggf. `defaultRelationType`.

### 6.5 Verbinder-UI (`board-connectors.tsx`)

- SVG `<line>` oder Pfad; Pfeilspitzen via `<marker>` (`connector-arrow-head.tsx`).
- **Hit-Area:** breiter transparenter Stroke `connectorHitStrokeWidth(zoom)`.
- **Selektion:** Klick auf Linie → `selectConnector`; Farbe/Stärke selected-State.
- **Label:** Text mittig auf Linie (`boardConnectorCaption`).
- **Endpoint-Drag:** Kreis-Handles an `start`/`end`; `beginConnectorEndpointDrag` wandelt Screen→World; Commit → `reconnectConnector` mit Snap-Filter `["element","boundedContext","swimlane"]`.
- **Draft-Linie:** während `connectorDraftSource` gesetzt, vom Source-Anker zum Cursor.

Attribute `data-board-connector` für Hit-Test-Delegation (`connector-canvas-input.ts`).

### 6.6 Tool-Modi im Store

| Flag | Wirkung |
|------|---------|
| `relationMode` | Verbinden aktiv; schaltet Context-Map/Linienmodus ab |
| `connectorDraftSource` / `relationDraftSourceId` | Erster Endpunkt gesetzt |
| `contextMapMode` | Nur BC↔BC; Draft `contextMapDraftSourceId` |
| `lineDrawMode` | Freihand-Linien |
| Shift+Drag auf Leerfläche bei `relationMode` | `shouldStartConnectorLineDraw` → Punkt-zu-Punkt-Linie |

`isConnectorToolActive` = `relationMode` (`connector-tool.ts`).

### 6.7 Store-API (Auszug)

- Elemente: `addElement`, `updateElement`, `removeElements`, `moveCanvasSelection`, …
- Relationen: `addRelation`, `updateRelation`, `removeRelation`, `setRelationType`, `reconnectRelation`
- Generisch: `addConnector`, `updateConnector`, `removeConnector`, `reconnectConnector`
- Context: `addContextRelation`, `updateContextRelation`, `reconnectContextRelation`
- Auswahl: `selectConnector`, `setRelationMode`, `setContextMapMode`, …

**Duplikate:** `addRelation` vermeidet identische Paare (gleiche IDs + Typ) — vor Implementierung Store-Code lesen.

---

## 7. Undo, Gesten & History

- `beginGesture()` beim Pointer-Down an Drag/Resize; `endGesture()` bei Pointer-Up.
- Domain-Snapshot (`captureDomain`) enthält Elemente, Regionen, Connectors-Legacy-Felder, Timeline, Viewport der Sicht, etc.
- `undo` / `redo` über `board-history.ts`; **nicht** in `.storm.json` gespeichert.
- Suche, Tool-Modi, reine Viewport-Änderungen können je nach Aktion in History sein oder nicht — Viewport oft mitgespeichert bei strukturellen Änderungen.

Gruppen-Drag = **ein** History-Eintrag.

---

## 8. Validierung (soft)

`validateBoard(elements, relations, contextRelations)` — Hinweise in Sidebar, blockieren nicht:

- Isolierte Elemente, Hotspot ohne Beschreibung, fehlende Pflicht-Metadata je Typ
- Relation `executedBy`: erwartet Actor→Command
- Cross-`boundedContextId` ohne `contextRelations`-Kante zwischen den BCs
- Zeitliche Warnung: Command rechts vom verbundenen Event

---

## 9. Persistenz & JSON

Pro **Sicht** in `views[]`:

| Feld | Inhalt |
|------|--------|
| `elements` | `StormElement[]` |
| `relations` | Element↔Element |
| `contextRelations` | BC↔BC |
| `canvasLines` | Freie Linien |
| `swimlanes`, `boundedContexts` | Regionen |
| `timeline`, `viewport`, `snapToGrid`, `snapToTimeline` | Canvas-Setup |
| `customCardTypes` | Optionale Stereotypen |

Beispiel Relation:

```json
{
  "id": "rel-1",
  "type": "triggers",
  "sourceId": "a",
  "targetId": "b",
  "labelMode": "type"
}
```

Beispiel Connector-Laufzeit (intern, optional exportierbar):

```json
{
  "id": "rel-1",
  "source": { "attach": "element", "id": "a" },
  "target": { "attach": "element", "id": "b" },
  "relationType": "triggers",
  "arrowHead": "end",
  "labelMode": "type"
}
```

Schema: `public/schemas/board-snapshot-v2.schema.json`. KI-Import/Export zusätzlich `ai-board-context-v1` (`ai-board-context-import.ts`) — gleiche Kernfelder inkl. Layout.

---

## 10. Porting-Checkliste

### Minimal

- [ ] Weltkoordinaten + Viewport Pan/Zoom
- [ ] `StormElement` rendern mit typabhängigem Style-Lookup
- [ ] Auswahl, Drag, 8-Handle-Resize
- [ ] `relations` + SVG center→edge
- [ ] JSON Load/Save `elements` + `relations`

### Entspricht E2 Canvas/Verbinder

- [ ] `BoardConnector[]` Runtime + `connectorsToLegacy` / `legacyToConnectors`
- [ ] Swimlanes + BCs + `applyContainmentAssignments`
- [ ] `relationMode`, Draft-Source, Pfeil an Karte, Endpoint-Reconnect + Snap
- [ ] Context-Map-Kanten BC↔BC mit Muster-Styles
- [ ] Freie Linien (`point` endpoints / `canvasLines`)
- [ ] `defaultRelationType`, `labelMode`, Default dashed für `informs`/`annotates`
- [ ] Z-Order: Linien unter Karten, Handles oben
- [ ] `beginGesture`/`endGesture` + Undo für Gruppenbewegung
- [ ] Detailleiste + optionale Karten-Vorschau (`card-preview`)
- [ ] Vitest-Dateien als Spec: `connector-*`, `board-connector-*`, `region-containment.test.ts`

---

## 11. Hinweise für KI-generierte Boards

1. Stabile `id`s für alle referenzierten Objekte.
2. Positionen in Weltkoordinaten; Größen weglassen = Defaults aus Styles.
3. Relationen: `sourceId`/`targetId` müssen existieren; `type` setzen oder Heuristik nachbauen.
4. BC-Zuordnung: entweder `boundedContextId` setzen oder Rechtecke so legen, dass Containment passt.
5. Cross-BC-Element-Relationen: passende `contextRelations` zwischen den BC-IDs ergänzen.
6. `$schema` auf v2-Schema-URL für Validierung.

---

*KI-Porting-Referenz, Fokus Funktion/UI/Implementierung. Codebasis `event-storming-tool` 0.1.0.*
