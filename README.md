# E2 — Event Storming Tool

Browserbasiertes Event-Storming-Tool mit lokaler JSON-Persistenz (`.storm.json`).

**Live:** [abx-git.github.io/E2](https://abx-git.github.io/E2/)

## Features

- Freies Canvas mit Pan/Zoom
- Alle 10 Event-Storming-Elementtypen (Domain Event, Command, Actor, Aggregate, Policy, Read Model, External System, UI, Hotspot, Pivotal Event)
- Relationen zwischen Elementen
- Timeline, Swimlanes, Bounded Contexts
- Facilitator-Modus für Big Picture, Process Modeling und Software Design
- Hotspot-Liste, Glossary, Validierungshinweise
- Export: JSON (+ JSON Schema), SVG, PNG, Markdown-Reports

## JSON-Format für andere Tools

Board-Dateien (`.storm.json`) folgen einem festen Schema:

- Schema: [`public/schemas/board-snapshot-v1.schema.json`](public/schemas/board-snapshot-v1.schema.json)
- Live: [abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json](https://abx-git.github.io/E2/schemas/board-snapshot-v1.schema.json)
- Doku: [docs/BOARD-JSON-SCHEMA.md](docs/BOARD-JSON-SCHEMA.md)
- In der App: **Daten → JSON Schema herunterladen**

## GitHub Pages deployen

Die öffentliche URL wird per **GitHub Pages** ausgeliefert (statischer Build, kein Node auf dem Host).

**Ausführliche Anleitung:** [docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md)

Repository: [github.com/abx-git/E2](https://github.com/abx-git/E2) · Workflow: `.github/workflows/deploy-github-pages.yml`

Kurz:

1. **Settings → Pages** → Source: **GitHub Actions**
2. Push auf `main` → Workflow baut `out/` und publiziert
3. App: `https://abx-git.github.io/E2/`

Optional: Variable `NEXT_PUBLIC_BASE_PATH` (Standard: `/E2` bzw. `/{repo-name}`).

Lokal testen:

```bash
npm run build:static
npx serve out
# → http://localhost:3000/E2/
```

## Entwicklung

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test:run
```

## Tech Stack

Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Serwist (PWA)

Basierend auf dem Persistenz-Muster von [T2](https://github.com/abx-git/T2).
