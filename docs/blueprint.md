---
type: architecture-blueprint
title: "Blueprint — what's next"
description: "Architecture documentation checklist for E2"
resource: "repo://"
tags: [architecture]
timestamp: "2026-08-06"
---

# Blueprint — E2 Software design tool

**What's next** for the docs. Tick items as you go: `[ ]` open · `[~]` in progress · `[x]` done.

Files listed below are **planned** — create them only when Adopt / Extend docs / a Studio action produces them. Do not pre-create empty stubs.

**DOC_FOCUS (session):** security

## Checklist

| Status | Chapter | File (create when working this row) | Notes |
|--------|---------|-------------------------------------|--------|
| [x] | Fill entry-point facts | [entry-point.md](entry-point.md) | Stack, source map, persistence/deploy facts |
| [x] | Introduction and Goals | [arc42/introduction.md](arc42/introduction.md) | Requirements, quality goals, stakeholders |
| [x] | Architecture Constraints | [arc42/constraints.md](arc42/constraints.md) | Tech/org constraints (Next, static Pages, MIT) |
| [x] | Context and Scope *(interfaces)* | [arc42/context.md](arc42/context.md) | Browser, FS Access, schemas, Supabase, Pages |
| [x] | Solution Strategy | [arc42/solution-strategy.md](arc42/solution-strategy.md) | Local-first + optional Yjs/Supabase |
| [x] | Building Block View *(implementation)* | [arc42/building-blocks.md](arc42/building-blocks.md) | `app` / `components` / `lib` / `store` / `collab` |
| [x] | Runtime View *(interfaces)* | [arc42/runtime.md](arc42/runtime.md) | Solo edit vs collab room sync paths |
| [x] | Deployment View *(deployment)* | [arc42/deployment.md](arc42/deployment.md) | Static Pages vs standalone; Serwist |
| [x] | Cross-cutting Concepts *(persistence, security, observability)* | [arc42/cross-cutting.md](arc42/cross-cutting.md) | `.storm.json`, RLS/keys, logging gaps |
| [x] | Architecture Decisions *(security)* | [arc42/decisions.md](arc42/decisions.md) | ADR-001…008 workshop-grade collab, keys, CAS, … |
| [ ] | Quality Requirements | arc42/quality.md | Expand from introduction §1.2 |
| [x] | Risks and Technical Debt | [arc42/risks.md](arc42/risks.md) | Beta format; collab; glossary binding |
| [ ] | Glossary | arc42/glossary.md | Product + domain terms |
| [ ] | Domain knowledge (optional) | domain/ | Only if workshop/domain depth needed |
| [ ] | Index + log (OKF) | index.md, log.md | When multi-chapter set stabilizes |

## Spikes

| ID | Track | Title | Type | Path | Status | Date |
|----|-------|-------|------|------|--------|------|
| — | — | — | — | — | — | — |

## Reviews

| ID | Target | Reviewed | Verdict | Report | Findings |
|----|--------|----------|---------|--------|----------|
| — | — | — | — | — | — |

## Session notes

| Date | Summary |
|------|---------|
| 2026-08-06 | Minimal starter from AGM Studio (entry-point + blueprint only) |
| 2026-08-06 | **Adopt B–C:** Filled entry-point from README/package/src evidence; arc42 checklist aligned to DOC_FOCUS; created [arc42/introduction.md](arc42/introduction.md). Note: README still links deleted `docs/BOARD-JSON-SCHEMA.md`, `docs/COLLABORATION.md`, `docs/GITHUB-PAGES.md` — do not recreate empty; cover via arc42 chapters + existing schemas/SQL/workflow. Next: Context (§3) or Cross-cutting (persistence/security). |
| 2026-08-06 | **Extend:** Created [arc42/context.md](arc42/context.md) (business + technical interfaces I1–I5). Entry-point link map updated. Next DOC_FOCUS candidates: Cross-cutting (persistence/security/observability) or Deployment (§7). |
| 2026-08-06 | **Extend:** Created [arc42/cross-cutting.md](arc42/cross-cutting.md) — persistence (local + collab CAS), security controls/residual risk, observability gap. Next DOC_FOCUS: Deployment (§7) or Building blocks (§5 / implementation). |
| 2026-08-06 | **Extend:** Created [arc42/deployment.md](arc42/deployment.md) — static Pages vs standalone, CI pipeline, Serwist/PWA, config surfaces. Remaining DOC_FOCUS: Building blocks (§5 / implementation). |
| 2026-08-06 | **Extend:** Created [arc42/building-blocks.md](arc42/building-blocks.md) — L1 whitebox + L2 UI/store/lib/collab. **DOC_FOCUS areas covered** (implementation, persistence, security, deployment, interfaces, observability). Optional next: Runtime, Solution Strategy, Constraints, Risks. |
| 2026-08-06 | **Extend:** Created [arc42/runtime.md](arc42/runtime.md) — RT1–RT6 solo autosave/conflict and collab join/CAS/leave. Next: Solution Strategy, Constraints, or Risks. |
| 2026-08-06 | **Extend:** Created [arc42/solution-strategy.md](arc42/solution-strategy.md) — local-first, schema interchange, static+PWA, opt-in collab. Next: Constraints or Risks. |
| 2026-08-06 | **Extend:** Created [arc42/constraints.md](arc42/constraints.md) — technical/org/convention constraints (static export, browser APIs, MIT, beta format). Core arc42 §§1–8 now present. Next: Risks, Quality, Decisions, or Glossary. |
| 2026-08-06 | **Docs fix:** Sanitized Mermaid fences in arc42 chapters (quoted labels; sequence messages without `+` activation traps). AGM Studio DocViewer: `securityLevel: antiscript`, parse-before-render, clearer Mermaid errors. |
| 2026-08-06 | **Extend:** Created [arc42/risks.md](arc42/risks.md) — risks R-01…R-09, debt D-01…D-08. Next: Quality, Decisions, or Glossary. |
| 2026-08-06 | **Build · Continue (security):** Created [arc42/decisions.md](arc42/decisions.md) — ADR-001…008 from schema/collab/middleware evidence; open product questions left in risks §11.4. Next: Quality (§10) or Glossary. |
