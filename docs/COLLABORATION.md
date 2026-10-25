# Optional real-time collaboration (Supabase)

E2 supports **workshop-grade** multi-user sessions when a [Supabase](https://supabase.com) project is configured. Domain data still lives in the browser and in the user’s `.storm.json`; the cloud project only stores **room metadata** and **durable board snapshots** for sync.

## What you need

1. A Supabase project (Free tier is enough for workshops).
2. **Anonymous Auth** enabled: Dashboard → Authentication → Providers → Anonymous.
3. Run [`supabase/schema.sql`](../supabase/schema.sql) in the SQL Editor (rooms, snapshots, RLS, optional Realtime publication).
4. Client credentials (publishable / anon key only — **never** the service role key in the app):
   - **Deployed build:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` or hosting env.
   - **Static hosting (e.g. GitHub Pages):** users can save URL + key in the browser via **Collaboration room → gear icon** (stored in `localStorage`).

## How sync works

| Layer | Role |
|--------|------|
| **Yjs + Realtime Broadcast** | Low-latency peer updates and presence (names/colors). |
| **Postgres `board_snapshots`** | Debounced durable state (~700 ms) with **optimistic locking** on `revision` (CAS). |
| **Poll / `postgres_changes`** | Fallback if Broadcast or table replication is unavailable (~1.5 s). |

If Broadcast fails, the app stays in the room and continues via snapshot sync (status may show a warning).

## User-facing rules

- **Join** with a 6-character room code or `?room=CODE` in the URL.
- **Create room** requires a **saved working file** (attached + clean) so the workshop has a defined sync anchor.
- During a session, the **working file is not mirrored** (autosave paused); leaving offers **keep board** or **restore pre-room stash**.
- **One writer tab** per browser profile (Web Locks): background tabs are passive.
- **Sync conflicts** show a dialog; E2 does not silently overwrite when local edits diverge from a newer server revision.

## Security model

Secrecy is **room code + publishable key** under RLS — suitable for facilitated workshops, not multi-tenant isolation. Treat board content as sensitive; use HTTPS and a dedicated Supabase project per organization if needed.

## Tests

- Unit/integration (mocked): `npm run test:collab-smoke`
- Live browser smoke (requires env keys): `npm run test:e2e:collab` — see [`playwright.config.ts`](../playwright.config.ts) if present on your branch.

## Related docs

- [cross-cutting.md](arc42/cross-cutting.md) §8.1–8.2 — persistence and security
- [runtime.md](arc42/runtime.md) — enter room / live edit scenarios
- [risks.md](arc42/risks.md) — R-02, R-03, collab complexity
