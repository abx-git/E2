# Baseline vor Draw.io-Canvas (Hybrid)

Dieses Dokument markiert den **festgeschriebenen Stand** der Codebasis **unmittelbar vor** der geplanten Umstellung: E2-Canvas durch einen eingebetteten Draw.io-/mxGraph-Editor ersetzen, während `.e2.json`, Eigenschaften/Funktionen, Relationen, Workshop-Features und Kollaboration im Domain-Modell bleiben.

## Git-Referenz

| | |
|--|--|
| **Tag** | [`pre-drawio-canvas-baseline`](https://github.com/abx-git/E2/releases/tag/pre-drawio-canvas-baseline) |
| **Commit** | `12a352e` (Zeile `main` zum Zeitpunkt der Baseline) |
| **Paketversion** | `0.2.2` (`package.json`) |
| **Datum (Europe/Berlin)** | 24. November 2026 |

Zurücks springen (nur lesen / Vergleich):

```bash
git fetch --tags
git checkout pre-drawio-canvas-baseline
```

Branch von diesem Stand für Experimente:

```bash
git checkout -b experiment/drawio-canvas pre-drawio-canvas-baseline
```

## Technischer Stand dieser Baseline

### Canvas / Rendering

- **Editor:** eigener React-Canvas — [`src/components/storm-canvas.tsx`](../src/components/storm-canvas.tsx)
- **Elemente:** [`storm-element-card.tsx`](../src/components/storm-element-card.tsx), Store [`storm-board-store.ts`](../src/store/storm-board-store.ts)
- **Konnektoren:** [`board-connectors.tsx`](../src/components/board-connectors.tsx), Typen in [`types/board-connector.ts`](../src/types/board-connector.ts)
- **Detail / Eigenschaften & Funktionen:** [`element-detail-sidebar.tsx`](../src/components/element-detail-sidebar.tsx); Felder in [`types/storm-element.ts`](../src/types/storm-element.ts) (`attributes`, `operations`, typspezifische Metadaten)

### Draw.io (nur Export, kein Editor)

- mxfile-Erzeugung: [`buildDrawioMxFile`](../src/lib/storm-export.ts)
- Konnektoren im Export: [`drawioExportConnectorCells`](../src/lib/board-export-connectors.ts)
- UI: Zwischenablage / Download (`.drawio.svg`) — keine Rückimport-Pipeline
- Tests: [`storm-export.drawio.test.ts`](../src/lib/storm-export.drawio.test.ts)

### Persistenz & Kollaboration

- **Dateiformat:** `.e2.json` (Schema v2) — [`public/schemas/board-snapshot-v2.schema.json`](../public/schemas/board-snapshot-v2.schema.json)
- **Kollab:** Yjs + Supabase, Payload als JSON-String — [`src/lib/collab/yjs-board.ts`](../src/lib/collab/yjs-board.ts)

### Bewusst nicht Teil der Baseline-Änderung

Die geplante Nachfolgearbeit (Draw.io eingebettet, Sync-Schicht E2 ↔ mxGraph) beginnt **nach** diesem Tag; bis dahin gilt der Tag als Referenz für Diff, Releases und Rollback-Diskussion.