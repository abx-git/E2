# Board JSON Schema (v2)

Andere Tools können gültige `.storm.json`-Dateien für E2 erzeugen, indem sie gegen dieses Schema validieren.

## Schema-Datei

| Quelle | URL / Pfad |
|--------|------------|
| Im Deploy | [https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json](https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json) |
| Im Repo | [`public/schemas/board-snapshot-v2.schema.json`](../public/schemas/board-snapshot-v2.schema.json) |
| Legacy v1 | [`public/schemas/board-snapshot-v1.schema.json`](../public/schemas/board-snapshot-v1.schema.json) (Import weiter unterstützt) |
| App-Export | **Daten → JSON Schema herunterladen** |

## Kennung

Exportierte Boards enthalten:

```json
{
  "$schema": "https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json",
  "format": "event-storming-tool",
  "version": 2,
  ...
}
```

Import akzeptiert `format === "event-storming-tool"` und `version` **1 oder 2**. v1 wird beim Laden in ein v2-Dokument mit einer Sicht `"Board"` migriert. Speichern schreibt immer v2. `$schema` ist optional.

## KI-Kontext (reduziert)

Für Conversation-Context und Roundtrip mit Auto-Layout:

| Quelle | URL / Pfad |
|--------|------------|
| Im Repo | [`public/schemas/ai-board-context-v1.schema.json`](../public/schemas/ai-board-context-v1.schema.json) |
| App | **Daten → Export → KI-Schema** / **KI einfügen** |

```json
{
  "$schema": "https://abx-git.github.io/E2/schemas/ai-board-context-v1.schema.json",
  "format": "event-storming-tool-ai-context",
  "version": 1,
  "title": "Beispiel",
  "view": {
    "name": "Big Picture",
    "modelingMode": "eventStorming",
    "elements": [{ "type": "domainEvent", "label": "Order Placed", "order": 1 }]
  }
}
```

Ohne Koordinaten — beim Import legt die App Positionen (Timeline / Lanes / Bounded Contexts) an. Paste ersetzt das Board oder fügt als neue Sicht ein.

## Mermaid / PlantUML

Pro Sicht unter **Daten → Export → Diagramm**:

| Richtung | Formate |
|----------|---------|
| Export | `.mmd` (Mermaid) / `.puml` (PlantUML), auch Zwischenablage |
| Import | **Diagramm einfügen** oder „Als neue Seite importieren“ / JSON-Paste |

Mode-Mapping (Export): Event Storming & Co. → `flowchart`; DDD → `classDiagram` / PlantUML `class`; Daten → `erDiagram` / PlantUML `entity`; sonst PlantUML `component`. Import erkennt Diagrammtyp heuristisch und arrangiert über denselben Auto-Layout-Pfad wie KI-Kontext.

## Struktur

| Ebene | Felder |
|-------|--------|
| **Projekt** | `title`, `glossary`, `appearance`, `workshopMode`, `activeViewId`, `views[]` |
| **Sicht (Tab)** | `id`, `name`, Canvas-Inhalt, `modelingMode`, Facilitator, Snaps, `viewport` |

`workshopMode`: In der Kollaboration steuert es, ob der aktive Tab für alle synchron ist (`true`) oder lokal bleibt (`false`, wie Viewport).

## Minimalbeispiel

```json
{
  "$schema": "https://abx-git.github.io/E2/schemas/board-snapshot-v2.schema.json",
  "format": "event-storming-tool",
  "version": 2,
  "exportedAt": "2026-07-22T12:00:00.000Z",
  "title": "Beispiel",
  "glossary": [],
  "workshopMode": false,
  "activeViewId": "view-1",
  "views": [
    {
      "id": "view-1",
      "name": "Board",
      "modelingMode": "eventStorming",
      "workshopFormat": "free",
      "facilitatorEnabled": false,
      "facilitatorPhase": 0,
      "elements": [
        {
          "id": "evt-1",
          "type": "domainEvent",
          "label": "Order Placed",
          "x": 120,
          "y": 200,
          "width": 160,
          "height": 72
        }
      ],
      "relations": [],
      "contextRelations": [],
      "swimlanes": [],
      "boundedContexts": [],
      "timeline": { "y": 400, "startLabel": "Start", "endLabel": "Ende" },
      "viewport": { "x": 0, "y": 0, "zoom": 1 },
      "snapToTimeline": true,
      "snapToGrid": false
    }
  ]
}
```

## Migration v1 → v2

Flache v1-Felder (`elements`, `relations`, …, `modelingMode`, …) werden zu `views[0]` mit Namen `"Board"`. `workshopMode` startet als `false`.

## Optionale Felder (Rückwärtskompatibilität)

| Feld | Default beim Import |
|------|---------------------|
| `appearance` | Standard-Farbschema |
| `workshopMode` | `false` |
| View `modelingMode` | `eventStorming` |
| View `contextRelations` | `[]` |
| View `snapToTimeline` | `true` |
| View `snapToGrid` | `false` |
| Timeline `visible` | `true` |

`modelingMode` steuert Palette und Facilitator pro Sicht. Der Board-Inhalt darf Elementtypen aller Modi enthalten.

Weitere Typen: DDD, BDD, USM, Event Modeling, Prozess (`processFlow`), Daten (`dataModel`), sowie geteilte Annotationen inkl. `link` (URL oder Sicht) — siehe Schema-`$defs`.
