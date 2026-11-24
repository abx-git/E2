# Draw.io canvas sync (E2 hybrid)

`.e2.json` remains the source of truth. The embedded maxGraph editor mirrors layout and labels; structured fields (attributes, operations, workshop metadata) stay in the store and detail sidebar.

## Cell identity

Every synced mxCell carries `e2Kind` and `e2Id` in its **style** (semicolon-separated), plus a stable **id** prefix:

| `e2Kind` | mxCell id prefix | E2 entity |
|----------|------------------|-----------|
| `element` | `el_` | `StormElement.id` |
| `boundedContext` | `bc_` | `BoundedContext.id` |
| `swimlane` | `lane_` | `Swimlane.id` |
| `connector` | `conn_` | `BoardConnector.id` |
| `timeline` | `timeline` | not round-tripped (display only) |

Parser: [`src/lib/drawio/cell-ids.ts`](../src/lib/drawio/cell-ids.ts).

## E2 → mxGraph

- [`buildDrawioMxFile`](../src/lib/drawio/board-to-mx.ts) builds the full `mxfile`.
- Export coordinates include bounds offset `ox` / `oy` from [`computeBoardBounds`](../src/lib/drawio/board-to-mx.ts).

## mxGraph → E2

- [`layoutPatchesFromMxCells`](../src/lib/drawio/mx-to-board.ts) maps vertex geometry back to world coords (`x - ox`, `y - oy`).
- Deletes on the canvas remove matching domain ids when cells disappear.
- Context-map relations (`contextRelations`) are **not** in the mxGraph model yet — see [`ContextMapDrawioOverlay`](../src/components/context-map-drawio-overlay.tsx).

## Canvas engine

`localStorage` key `e2.canvasEngine`: `legacy` (React `StormCanvas`) or `drawio` (maxGraph). Toggle in appearance settings.