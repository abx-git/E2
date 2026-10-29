# Board JSON format (`.e2.json`)

E2 persists boards as JSON files, usually named `*.e2.json`. The working file is the **system of record** for solo use; optional collab mirrors snapshots to Supabase while a room is active.

## Versions

| Version | Shape | Notes |
|---------|--------|--------|
| **v1** | Flat document (elements, relations, … on the root) | Legacy; migrated to v2 on import |
| **v2** | `views[]` — one file, multiple board tabs | Current default |

Exported snapshots include metadata:

- `format`, `version`, `exportedAt`
- Optional `$schema` pointing at the published JSON Schema

## Canonical schemas (machine-readable)

| File | Purpose |
|------|---------|
| [`public/schemas/board-snapshot-v2.schema.json`](../public/schemas/board-snapshot-v2.schema.json) | Full board snapshot (export / collab durable state) |
| [`public/schemas/board-snapshot-v1.schema.json`](../public/schemas/board-snapshot-v1.schema.json) | Legacy flat snapshot |
| [`public/schemas/ai-board-context-v1.schema.json`](../public/schemas/ai-board-context-v1.schema.json) | AI copy/paste context (mode + view layout) |

Validation in the app uses these schemas for share links and imports where applicable.

## Migration

Opening a v1 file runs an in-app migration to the multi-view document model (`views[]`, active view id, per-view canvas data). Always keep backups before sharing files across E2 versions — the format is **Beta** (see README).

## Related

- README §6 — persistence, import/export, conflict handling
- [`storm-json.ts`](../src/lib/storm-json.ts) — normalization and export helpers
