# E2 Kollaboration (Supabase Free Tier)

Optionaler Live-Modus parallel zur lokalen `.storm.json`. Ohne Env-Vars verhält sich die App unverändert (Solo).

## Architektur

- **Persistenz:** Supabase Postgres (`rooms`, `board_snapshots`)
- **Live-Sync (Inhalt):** Snapshot in Postgres — Realtime `postgres_changes` + Polling-Fallback (~1,5 s). Reload/Join lesen denselben Stand.
- **Live-Sync (optional schnell):** Yjs CRDT über Supabase Realtime Broadcast (Presence/Awareness; Inhalt zusätzlich)
- **Presence:** Yjs Awareness (Name, Farbe)
- **Auth:** Anonymous Supabase Auth beim Join; Realtime erhält den JWT via `setAuth`
- **Deploy:** weiterhin statische GitHub Pages — nur `NEXT_PUBLIC_*` Keys im Client; **RLS ist Pflicht**

```text
Browser  ↔  Board-Store  ↔  debounced Snapshot → Postgres
                ↕                    ↕
         Yjs (Presence)     postgres_changes / Poll → Peers
```

## Setup (Supabase Free Project)

1. Projekt unter [supabase.com](https://supabase.com) anlegen (Free Tier).
2. SQL aus [`supabase/schema.sql`](../supabase/schema.sql) im SQL Editor ausführen  
   (**SQL → New query** → Dateiinhalt einfügen → **Run**).  
   Danach sollten die Tabellen `rooms` und `board_snapshots` unter **Table Editor** sichtbar sein.  
   Fehler *„Could not find the table 'public.rooms'“* = Schema noch nicht angewendet.  
   Am Ende der Datei steht `alter publication supabase_realtime add table …` — für Live-Updates ohne Polling nötig (wenn „already member“, ignorieren).
3. **Authentication → Providers → Anonymous** aktivieren  
   (Dashboard: **Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable**).  
   Ohne diesen Schalter meldet die App: *„Anonymous sign-ins are disabled“*.
4. Project URL + **publishable** (oder anon) public key kopieren.
5. Verbindung in der App setzen — **eine** der beiden Varianten:

### A) Build / `.env` (optional, z. B. eigener Deploy)

```bash
# .env.local (nicht committen)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Für GitHub Pages: dieselben Variablen als Secrets im Static Build einbetten.

### B) Nur Browser (ohne Rebuild)

1. App öffnen → **Raum** (Zahnrad) → Project URL + Key eintragen → **Speichern**.
2. Werte liegen in `localStorage` (`e2-supabase-connection`) — nur auf diesem Gerät/Browser.
3. Env hat Vorrang: ist `.env` gesetzt, sind die Browser-Felder gesperrt.

Client-Helfer: [`src/utils/supabase/`](../src/utils/supabase/) (`@supabase/ssr`). Middleware refresht Sessions unter `next dev` / Node-Hosting — auf **GitHub Pages (static export)** läuft Middleware nicht; der Browser-Client hält die Session lokal.

`npm run build` / `build:static` **ohne** Env-Vars → Solo + optionale Browser-Konfiguration (kein Rebuild nötig).

## Nutzung

1. **Daten → Kollaboration** oder Toolbar **Raum**.
2. Bei vorhandenem Board oder angebundener Arbeitsdatei erscheint eine **Bestätigung** (optional JSON-Export als Sicherheitskopie).
3. Join-Code / Link `?room=CODE` teilen.
4. Teilnehmende: Name wählen → beitreten (ebenfalls mit Bestätigung, falls lokal Inhalt vorhanden).
5. Banner zeigt „Live · n online“; bei angebundener Datei **Lokal gesichert** / **Lokal ungespeichert**.
6. **Verlassen:** Dialog — Raum verlassen (Board behalten) oder optional Stand vor dem Raum wiederherstellen.
7. Raum-Snapshot bleibt bis `expires_at`.

### Arbeitsdatei und Collab

| Situation | Verhalten |
|-----------|-----------|
| Join / Raum erstellen | Pre-Collab-Stand wird gestasht; Editor lädt Raum-Inhalt; **Datei→Editor ist blockiert** |
| Während Collab | Editor→Datei (Mirror) aktiv; Datei darf den Editor/Raum **nicht** überschreiben |
| Broadcast getrennt | Banner: Snapshot-Sync aktiv; ausstehende Edits werden best-effort geflusht |
| Verlassen | Zuerst Room-Snapshot flushen, dann Session beenden |
| Verlassen → Board behalten | Editor bleibt auf Raum-Stand; Stash verworfen (**empfohlen**, wenn Remote behalten) |
| Verlassen → Stand vor dem Raum | Nur nach Bestätigung: Stash → Editor + Datei (überschreibt lokalen Raum-Spiegel) |

**Beitreten ersetzt** den Editor-Inhalt durch den Raum (Undo-History wird geleert). Deshalb Bestätigung + optionaler JSON-Export / Speichern & beitreten.

## Workshop-Modus (Tab-Sync)

Toolbar-Schalter **Workshop**:

| Zustand | Verhalten in der Kollaboration |
|---------|--------------------------------|
| **An** | `activeViewId` wird mitgesynct — alle sehen denselben Tab |
| **Aus** (Standard) | Jeder Client behält den lokalen Tab (wie Viewport/Kamera) |

Projektweite Felder (`title`, Glossary, Darstellung) und alle Sichten werden immer geteilt. Das Flag liegt in der `.storm.json` / im Room-Snapshot (`version: 2`).

## Datenmodell

Siehe `supabase/schema.sql`:

| Tabelle | Zweck |
|---------|--------|
| `rooms` | Code, Titel, Host-Token-Hash, Expiry (default 14 Tage) |
| `board_snapshots` | Board-Snapshot JSONB (v1 oder v2) + optionales Yjs-State |

RLS: Zugriff nur über bekannten Room-Code / `room_id`; keine öffentliche Raumliste.

## Limits (Free Tier)

- Workshop-Größe ca. 5–20 Clients pro Raum geplant.
- Ein Realtime-Channel pro Raum; Awareness gedrosselt.
- Alte Räume über `expires_at` aufräumen (manuell oder Cron später).
- Keine Service-Role im Frontend.

## Undo

- **Solo:** bestehender Snapshot-History-Stack.
- **Collab:** Yjs `UndoManager` (nur eigene Transaktionen); fremde Edits werden nicht rückgängig gemacht.

## Phasen / Status im Code

| Phase | Inhalt | Ort |
|-------|--------|-----|
| 1 | Rooms + Snapshot load/save | `src/lib/collab/rooms.ts` |
| 2 | Yjs + Realtime + Presence | `src/lib/collab/yjs-*`, provider |
| 3 | UI, Host-Token, Reconnect | `collab-*-dialog`, banner |

## Sicherheitshinweise

- Anon-Key ist öffentlich — Policies in `schema.sql` nicht abschwächen.
- Host-Token nur in `sessionStorage` des Erstellers; Hash in DB.
- Kurze Codes + Expiry gegen Missbrauch; kein Directory-Endpoint.
