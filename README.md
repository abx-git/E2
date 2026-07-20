# E2 — Event Storming Tool

Browserbasiertes Event-Storming-Tool mit lokaler JSON-Persistenz (`.storm.json`).

## Features

- Freies Canvas mit Pan/Zoom
- Alle 10 Event-Storming-Elementtypen (Domain Event, Command, Actor, Aggregate, Policy, Read Model, External System, UI, Hotspot, Pivotal Event)
- Relationen zwischen Elementen
- Timeline, Swimlanes, Bounded Contexts
- Facilitator-Modus für Big Picture, Process Modeling und Software Design
- Hotspot-Liste, Glossary, Validierungshinweise
- Export: JSON, SVG, PNG, Markdown-Reports

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

Basierend auf dem Persistenz-Muster von [T2](../T2).
