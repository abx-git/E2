---
type: architecture-chapter
title: "9. Architecture Decisions"
description: "ADRs for E2 — security-focused decisions evidenced in code"
resource: "repo://"
tags: [architecture, arc42, decisions, security]
timestamp: "2026-08-06"
---

# 9. Architecture Decisions

Evidence sources: [`supabase/schema.sql`](../../supabase/schema.sql), [`src/lib/collab/config.ts`](../../src/lib/collab/config.ts), [`src/lib/collab/supabase.ts`](../../src/lib/collab/supabase.ts), [`src/lib/collab/session.ts`](../../src/lib/collab/session.ts), [`middleware.ts`](../../middleware.ts), [`.env.example`](../../.env.example), [cross-cutting.md](cross-cutting.md) §8.2, [constraints.md](constraints.md) TC8, [solution-strategy.md](solution-strategy.md) §4.5.

Related: [risks.md](risks.md) · [cross-cutting.md](cross-cutting.md) · [entry-point.md](../entry-point.md)

This chapter records **decided** architecture choices with source evidence. Open product questions stay in [risks.md](risks.md) §11.4 until a human accepts them — no invented mitigations here.

**DOC_FOCUS (this session):** security.

## Decision index

| ID | Title | Status | Security relevance |
|----|-------|--------|--------------------|
| [ADR-001](#adr-001-workshop-grade-collaboration-security) | Workshop-grade collaboration security | Accepted | Threat model |
| [ADR-002](#adr-002-publishableanon-key-only-in-the-client) | Publishable/anon key only in the client | Accepted | Secret boundary |
| [ADR-003](#adr-003-env-credentials-over-localstorage-https-url-check) | Env credentials over localStorage; HTTPS URL check | Accepted | Credential handling |
| [ADR-004](#adr-004-host-token-hashed-at-rest-raw-token-in-browser) | Host token hashed at rest; raw token in browser | Accepted | Host capability |
| [ADR-005](#adr-005-anonymous-auth-for-collab-no-account-for-solo) | Anonymous auth for collab; no account for solo | Accepted | Identity model |
| [ADR-006](#adr-006-conflict-safe-persistence-cas-and-dialogs) | Conflict-safe persistence (CAS + dialogs) | Accepted | Integrity |
| [ADR-007](#adr-007-middleware-session-refresh-only-on-node-hosting) | Middleware session refresh only on Node hosting | Accepted | Deploy/auth gap |
| [ADR-008](#adr-008-no-app-level-encryption-of-board-data) | No app-level encryption of board data | Accepted | Data-at-rest stance |

---

## ADR-001: Workshop-grade collaboration security

| Field | Content |
|-------|---------|
| **Status** | Accepted (evidenced in product) |
| **Date** | 2026-08-06 (documented) |

### Context

Optional multi-user rooms need *some* access control on Free-tier Supabase without turning E2 into an enterprise multi-tenant SaaS.

### Decision

Treat collab as **workshop-grade**: anyone who knows the **publishable/anon key** and a live **room code** can read/update non-expired room data under RLS. Secrecy of code + key is the gate; rooms expire (14 days).

### Consequences

- Suitable for facilitated workshops; **not** private multi-tenant isolation.
- Residual risk documented as R-02 in [risks.md](risks.md); operators must not over-claim confidentiality.

### Evidence

- RLS policies for `anon`/`authenticated` on non-expired rooms — `supabase/schema.sql`
- Constraint TC8 — [constraints.md](constraints.md)
- Controls / residual table — [cross-cutting.md](cross-cutting.md) §8.2

---

## ADR-002: Publishable/anon key only in the client

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

Browser and static GitHub Pages builds cannot safely hold privileged server secrets.

### Decision

Ship only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon alias allowed). **Never** embed a Supabase service-role key in the app.

### Consequences

- All privileged ops that would need service-role stay out of E2 client scope.
- Publishable key is public by design; RLS + room TTL must carry the workshop model (ADR-001).

### Evidence

- [`.env.example`](../../.env.example) — only public URL/key vars
- Connection helpers in `src/lib/collab/config.ts` — no service-role path
- Explicit non-approach alignment — [solution-strategy.md](solution-strategy.md) §4.5 / TC8

---

## ADR-003: Env credentials over localStorage; HTTPS URL check

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

Static Pages hosting may have no server env; operators still need a way to point at Supabase. Mixed HTTP endpoints would weaken transport security for credentials and room traffic.

### Decision

1. **Deployed env wins** over browser-saved connection when both exist.
2. Browser-saved connection (static solo hosting) is allowed in `localStorage`.
3. Saving a local connection **rejects** URLs that do not start with `https://`.

### Consequences

- Operators of controlled deploys can pin credentials via env.
- Static solo users can self-configure; XSS on the origin can still read localStorage keys (R-03).

### Evidence

- `getSupabaseConnection()` / `saveLocalSupabaseConnection()` — `src/lib/collab/config.ts` (`URL muss mit https:// beginnen`)
- Documented in [cross-cutting.md](cross-cutting.md) §8.2 and [context.md](context.md)

---

## ADR-004: Host token hashed at rest; raw token in browser

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

Room hosts need a capability distinct from generic room joiners without introducing full user accounts.

### Decision

- Generate a random host token client-side (`crypto.getRandomValues`).
- Store **SHA-256** hash in `rooms.host_token_hash`.
- Keep the **raw** token in `localStorage` (keyed with room code) for the hosting browser profile.

### Consequences

- DB compromise does not yield usable host tokens in cleartext.
- XSS on the app origin can exfiltrate the raw host token for that profile (accepted residual — R-03).

### Evidence

- `generateHostToken` / `hashHostToken` — `src/lib/collab/config.ts`
- Column `host_token_hash` — `supabase/schema.sql`
- Room create / host checks — `src/lib/collab/rooms.ts`

---

## ADR-005: Anonymous auth for collab; no account for solo

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

Solo modeling must work without signup. Collab still needs a Supabase Auth session for RLS roles (`anon` / `authenticated`).

### Decision

- Solo: **no** auth required.
- Collab: `signInAnonymously()` before room ops (`ensureAnonSession`).
- Schema comment requires Anonymous Auth enabled on the Supabase project.

### Consequences

- Low friction for workshops; no identity provider integration in-product.
- Auth is session/capability oriented, not named-user ACLs.

### Evidence

- `src/lib/collab/supabase.ts` — `signInAnonymously`
- Header of `supabase/schema.sql` — “Requires Anonymous Auth enabled”
- [solution-strategy.md](solution-strategy.md) §4.5 — “Mandatory accounts for modeling” rejected

---

## ADR-006: Conflict-safe persistence (CAS and dialogs)

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

Silent overwrite of local files or room snapshots would destroy workshop work and undermine integrity under concurrent editors.

### Decision

- Collab durable writes use **revision CAS** — never “fetch latest then overwrite.”
- Solo working-file conflicts surface an explicit dialog (keep local / take disk).
- During collab, working-file mirror respects CAS / conflict policy.

### Consequences

- Integrity preferred over automatic merge convenience.
- Users can still choose the wrong side if they misunderstand the dialog (R-06) — UX risk, not silent clobber.

### Evidence

- Comment and path in `src/lib/collab/session.ts` (“CAS against the revision we last applied/wrote”)
- [runtime.md](runtime.md) RT1–RT6 · [cross-cutting.md](cross-cutting.md) §8.1–8.2

---

## ADR-007: Middleware session refresh only on Node hosting

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

Primary public deploy is static GitHub Pages (`output: "export"`), where Next middleware does not run.

### Decision

Keep `middleware.ts` session refresh for `next dev` / **standalone** Node hosting; document that **static Pages do not refresh cookies**. Collab on Pages relies on browser anon sign-in + env or localStorage connection (ADR-003 / ADR-005).

### Consequences

- Dual hosting paths with different auth cookie behavior (R-05).
- Operators must not assume middleware on Pages.

### Evidence

- Explicit comment in [`middleware.ts`](../../middleware.ts)
- [deployment.md](deployment.md) · risk R-05

---

## ADR-008: No app-level encryption of board data

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Date** | 2026-08-06 (documented) |

### Context

`.storm.json` and collab snapshots may contain sensitive domain knowledge. Implementing encryption-at-rest inside the client would add key-management UX and still leave export/share paths.

### Decision

**Do not** encrypt board payloads inside E2. Rely on OS/file permissions for local files and on the operator’s Supabase project configuration for room snapshots.

### Consequences

- Simpler local-first model; sensitivity is an operator/facilitator concern (R-08).
- Future encryption would be a **new** ADR, not assumed here.

### Evidence

- Explicit non-approach — [solution-strategy.md](solution-strategy.md) §4.5
- Residual risk table — [cross-cutting.md](cross-cutting.md) §8.2

---

## Not decided yet (do not invent)

| Topic | Why parked | Where tracked |
|-------|------------|---------------|
| Tighter-than-workshop collab model | Product acceptance open | [risks.md](risks.md) §11.4 Q2 |
| Lightweight error reporter / APM | No SDK in `src/` today | [risks.md](risks.md) R-07 / §11.4 Q3 |
| README dead-link retarget | Docs/product PR, not security ADR | [risks.md](risks.md) R-09 / §11.4 Q1 |

## Related next chapters

- Quality Requirements — measurable targets from [introduction.md](introduction.md) §1.2 (incl. “safe optional collaboration”)
- Glossary — terms: host token, room code, CAS, publishable key, workshop-grade
