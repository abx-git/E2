# Board JSON Schema (v1)

Andere Tools können gültige `.storm.json`-Dateien für E2 erzeugen, indem sie gegen dieses Schema validieren.

## Schema-Datei

| Quelle | URL / Pfad |
|--------|------------|
| Im Deploy | [https://abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json](https://abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json) |
| Im Repo | [`public/schemas/board-snapshot-v1.schema.json`](../public/schemas/board-snapshot-v1.schema.json) |
| App-Export | **Daten → JSON Schema herunterladen** |

## Kennung

Exportierte Boards enthalten:

```json
{
  "$schema": "https://abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json",
  "format": "event-storming-tool",
  "version": 1,
  ...
}
```

Import akzeptiert Dokumente mit `format === "event-storming-tool"` und `version === 1`. Das Feld `$schema` ist optional.

## Minimalbeispiel

```json
{
  "$schema": "https://abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json",
  "format": "event-storming-tool",
  "version": 1,
  "exportedAt": "2026-07-20T12:00:00.000Z",
  "title": "Beispiel",
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
  "swimlanes": [],
  "boundedContexts": [],
  "timeline": { "y": 400, "startLabel": "Start", "endLabel": "Ende" },
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "glossary": [],
  "snapToTimeline": true,
  "snapToGrid": false
}
```
