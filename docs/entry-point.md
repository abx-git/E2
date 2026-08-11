---
type: architecture-entry
title: "Entry point — start here"
description: "Short facts and links for E2 architecture documentation"
resource: "repo://"
tags: [architecture]
timestamp: "2026-08-06"
---

# Entry point — E2 Software design tool

**Start here.** Put this file in the AI context. Short facts + links to what exists.

## About this system

**Application:** E2 Software design tool (npm: `event-storming-tool`)  
**Domain:** Browser-based collaborative board for domain workshops — Event Storming, DDD, BDD / Example Mapping, User Story Mapping, Event Modeling, process (BPMN-lite), and data (ER-lite) — with local-first `.storm.json` persistence.  
**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · Zustand · Serwist (PWA) · Yjs · optional Supabase (Realtime collab)  
**Template:** arc42  
**License:** MIT  
**Live:** [abx-git.github.io/E2](https://abx-git.github.io/E2/) · **Repo:** [github.com/abx-git/E2](https://github.com/abx-git/E2)

## Source code map

| Module | Path | Notes |
|--------|------|--------|
| App shell (Next.js App Router) | `src/app/` | `page.tsx`, PWA `manifest.ts`, offline `~offline/` |
| UI / board chrome | `src/components/` | Canvas, palette, facilitator, collab dialogs, data panel |
| Domain / board logic | `src/lib/` | JSON I/O, export, regions, views, validators |
| Collaboration | `src/lib/collab/` | Yjs board sync, Supabase provider, rooms, session |
| Client state | `src/store/storm-board-store.ts` | Zustand board store |
| Types | `src/types/` | Elements, relations, annotations |
| Supabase helpers | `src/utils/supabase/` | Browser / server / middleware session |
| Service worker | `src/sw.ts` → `public/sw.js` | Serwist precache + offline fallback |
| Board JSON schemas | `public/schemas/` | `board-snapshot-v1/v2`, `ai-board-context-v1` |
| Collab DB schema | `supabase/schema.sql` | Rooms + board snapshots, RLS |
| Static Pages deploy | `.github/workflows/deploy-github-pages.yml` | `npm run build:static` → `out/` |
| Static build script | `scripts/build-static.sh` | `E2_BUILD_TARGET=static`, basePath `/E2` |
| Product / feature truth | `README.md` | Implemented capabilities vs workshop methods |

## Persistence & interfaces (quick facts)

| Concern | Evidence |
|---------|----------|
| Primary store | Local `.storm.json` (File System Access where available); format v2 with `views[]`; v1 migrated on open |
| Schemas | [`public/schemas/board-snapshot-v2.schema.json`](../public/schemas/board-snapshot-v2.schema.json), AI context schema beside it |
| Optional collab | Supabase rooms + `board_snapshots`; Yjs over Realtime Broadcast (`src/lib/collab/`) |
| Deploy modes | Static export (GitHub Pages) **or** Next `standalone`; middleware/session refresh only on Node hosting |
| Env | `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or browser localStorage for static solo hosting) |

## Links

| What | Where |
|------|-------|
| What's next (checklist) | [blueprint.md](blueprint.md) |
| Introduction & goals (arc42 §1) | [arc42/introduction.md](arc42/introduction.md) |
| Constraints (arc42 §2) | [arc42/constraints.md](arc42/constraints.md) |
| Context & interfaces (arc42 §3) | [arc42/context.md](arc42/context.md) |
| Solution strategy (arc42 §4) | [arc42/solution-strategy.md](arc42/solution-strategy.md) |
| Cross-cutting (arc42 §8) | [arc42/cross-cutting.md](arc42/cross-cutting.md) |
| Architecture Decisions (arc42 §9) | [arc42/decisions.md](arc42/decisions.md) |
| Deployment (arc42 §7) | [arc42/deployment.md](arc42/deployment.md) |
| Building blocks (arc42 §5) | [arc42/building-blocks.md](arc42/building-blocks.md) |
| Runtime (arc42 §6) | [arc42/runtime.md](arc42/runtime.md) |
| Risks and debt (arc42 §11) | [arc42/risks.md](arc42/risks.md) |
| Feature / method coverage | [../README.md](../README.md) |
| Board snapshot schema (v2) | [../public/schemas/board-snapshot-v2.schema.json](../public/schemas/board-snapshot-v2.schema.json) |
| Collab SQL / RLS | [../supabase/schema.sql](../supabase/schema.sql) |
| Pages deploy workflow | [../.github/workflows/deploy-github-pages.yml](../.github/workflows/deploy-github-pages.yml) |

Further chapters, `domain/`, spikes, and reviews appear when you run **Extend docs** or create them in Studio. Do not invent empty files ahead of time.

## Session habit

1. Read this file → [blueprint.md](blueprint.md). Session prompts come from **AGM Studio**.
2. Create or fill the next checklist file only when that work starts.
3. Update this link map when new durable files appear. Tick blueprint when work moves forward.
