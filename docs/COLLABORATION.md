# E2 Kollaboration (Supabase Free Tier)

Optionaler Live-Modus parallel zur lokalen `.storm.json`. Ohne Env-Vars verhält sich die App unverändert (Solo).

## Architektur

- **Persistenz:** Supabase Postgres (`rooms`, `board_snapshots`)
- **Live-Sync:** Yjs CRDT über Supabase Realtime Broadcast
- **Presence:** Yjs Awareness (Name, Farbe)
- **Auth:** Anonymous Supabase Auth beim Join
- **Deploy:** weiterhin statische GitHub Pages — nur `NEXT_PUBLIC_*` Keys im Client; **RLS ist Pflicht**

```text
Browser  ↔  Yjs Doc  ↔  Realtime Channel (room:<code>)
                ↕
         debounced Snapshot → Postgres
```

## Setup (Supabase Free Project)

1. Projekt unter [supabase.com](https://supabase.com) anlegen (Free Tier).
2. SQL aus [`supabase/schema.sql`](../supabase/schema.sql) im SQL Editor ausführen  
   (**SQL → New query** → Dateiinhalt einfügen → **Run**).  
   Danach sollten die Tabellen `rooms` und `board_snapshots` unter **Table Editor** sichtbar sein.  
   Fehler *„Could not find the table 'public.rooms'“* = Schema noch nicht angewendet.
3. **Authentication → Providers → Anonymous** aktivieren  
   (Dashboard: **Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable**).  
   Ohne diesen Schalter meldet die App: *„Anonymous sign-ins are disabled“*.
4. Project URL + **publishable** (oder anon) public key kopieren.
5. Lokal bzw. in CI:

```bash
# .env.local (nicht committen)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# alternativ weiterhin: NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Client-Helfer: [`src/utils/supabase/`](../src/utils/supabase/) (`@supabase/ssr`). Middleware refresht Sessions unter `next dev` / Node-Hosting — auf **GitHub Pages (static export)** läuft Middleware nicht; der Browser-Client hält die Session dennoch lokal.

6. Für GitHub Pages: dieselben Variablen als Repository Secrets / Actions-Env setzen, sodass der Static Build sie einbettet.

`npm run build` / `build:static` ohne diese Vars → Collab-UI zeigt „nicht konfiguriert“, Solo funktioniert weiter.

## Nutzung

1. **Daten → Kollaboration → Raum erstellen** (oder Toolbar **Raum**).
2. Join-Code / Link `?room=CODE` teilen.
3. Teilnehmende: Name wählen → beitreten.
4. Banner zeigt „Live · n online“; Disconnect wird angezeigt.
5. Host (Ersteller) kann Raum später verlassen; Snapshot bleibt bis `expires_at`.
6. Jederzeit **JSON exportieren** (lokaler Stand).

Lokale Arbeitsdatei wird beim Join **nicht** automatisch überschrieben.

## Datenmodell

Siehe `supabase/schema.sql`:

| Tabelle | Zweck |
|---------|--------|
| `rooms` | Code, Titel, Host-Token-Hash, Expiry (default 14 Tage) |
| `board_snapshots` | `BoardSnapshotV1` JSONB + optionales Yjs-State |

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
