---
type: architecture-chapter
title: "1. Introduction and Goals"
description: "Requirements, quality goals, and stakeholders for E2"
resource: "repo://"
tags: [architecture, arc42]
timestamp: "2026-08-06"
---

# 1. Introduction and Goals

Evidence sources: [`README.md`](../../README.md), [`package.json`](../../package.json), [`public/schemas/board-snapshot-v2.schema.json`](../../public/schemas/board-snapshot-v2.schema.json), [`supabase/schema.sql`](../../supabase/schema.sql), [`.github/workflows/deploy-github-pages.yml`](../../.github/workflows/deploy-github-pages.yml).

## 1.1 Requirements overview

E2 is a **browser-based software design / domain-modeling board**. Workshop participants place typed stickies, connect them, organize timeline / swimlanes / bounded contexts, and export artifacts — without a mandatory server for domain data.

| ID | Requirement (from product evidence) | Source |
|----|--------------------------------------|--------|
| R1 | Support multiple modeling modes on one board: ES · DDD · BDD · USM · EM · PROC · DATA (palette/facilitator may filter; placed elements survive mode switches) | README Kurzüberblick / §1 |
| R2 | Local-first persistence: working file is `.storm.json` owned by the user (File System Access where available); auto-save and conflict handling | README §6 |
| R3 | Exchangeable board format with `$schema`, format `event-storming-tool`, version 2 (`views[]`); migrate v1 on import | `board-snapshot-v2.schema.json`, README §6 |
| R4 | Rich export: JSON, AI context, Mermaid/PlantUML, SVG/PNG (incl. draw.io SVG), method-specific Markdown reports | README §6 Export |
| R5 | Workshop facilitation: per-mode facilitator formats, phase checklists/timers, soft validation | README §7 Workshop-Praxis |
| R6 | Optional realtime multi-user collaboration via room + Yjs sync (Supabase); single-writer / CAS / conflict dialog — not silent overwrite | README §7; `src/lib/collab/`; `supabase/schema.sql` |
| R7 | Offline-capable PWA (Serwist service worker, `~offline` fallback) | README §6; `src/sw.ts`; `next.config.ts` |
| R8 | Static hosting on GitHub Pages (project pages under `/E2`) and optional Next standalone Node hosting | `build-static.sh`; deploy workflow; `next.config.ts` |

**Out of scope (explicit in README):** native Miro import; paper-workshop overlays beyond the core sticky catalogues; glossary binding to sticky labels (partial).

## 1.2 Quality goals

Prioritized from how the product is built and described (local-first, schema, static deploy, optional collab).

| Priority | Quality goal | Concrete implication | Evidence |
|----------|--------------|----------------------|----------|
| 1 | **Data ownership / local-first** | Domain board state lives in the user’s `.storm.json`; no server required for solo work | README lead; working-file components / `src/lib/storm-json.ts` |
| 2 | **Interoperability** | Validatable JSON + published schemas; exports for handoff (MD, diagram text, images) | `public/schemas/*`; README Export table |
| 3 | **Workshop usability** | Mode-aware palette, facilitator phases, undo/redo, multi-select, mobile sheets | README Bedienung / components |
| 4 | **Deployability / offline** | Static export to Pages; PWA precache; basePath-aware asset URLs | `deploy-github-pages.yml`; Serwist config |
| 5 | **Safe optional collaboration** | Collab is opt-in; rooms expire; RLS on snapshots; conflict UX instead of silent clobber | `supabase/schema.sql`; collab dialogs; README |

## 1.3 Stakeholders

| Role | Interest | Evidence |
|------|----------|----------|
| Workshop facilitator | Phase guidance, timers, type filtering, shared room sync | Facilitator panel + README Workshop |
| Domain expert / modeler | Sticky catalogues, relations, glossary, hotspots | README §1–5 |
| Downstream engineer / BA | Exports (event catalog, domain model, example map, etc.) and schema-valid JSON | README Export |
| Operator / maintainer | GitHub Actions Pages deploy; optional Supabase project + SQL | workflow; `supabase/schema.sql`; `.env.example` |
| End user (solo / PWA) | Open board offline; keep working file on device | Serwist; README Persistenz |

## 1.4 DOC_FOCUS hooks (for later chapters)

Session scope asked for **implementation, persistence, security, deployment, interfaces, observability**. Mapping for follow-up arc42 work:

| Focus | Suggested next chapter | Already evidenced here |
|-------|------------------------|-------------------------|
| Interfaces | Context (§3) — browser, FS Access, schema files, Supabase Realtime | R3, R6, schemas |
| Persistence | Cross-cutting (§8) / Building blocks — `.storm.json`, IndexedDB handles, snapshots | R2, R3 |
| Security | Cross-cutting — anon key, RLS, room codes, static vs middleware session | `schema.sql`, middleware note |
| Deployment | Deployment view (§7) — Pages static vs standalone | R8 |
| Implementation | Building block view (§5) — `components` / `lib` / `store` / `collab` | Source map in entry-point |
| Observability | Cross-cutting — **thin evidence today** (no dedicated APM/logging product surface found); treat as open question |

## Related

- Checklist: [../blueprint.md](../blueprint.md)
- Entry map: [../entry-point.md](../entry-point.md)
