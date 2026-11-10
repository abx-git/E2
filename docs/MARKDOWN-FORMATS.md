# E2 in Markdown: Formate & Wrapper (Entscheidung)

Diese Seite fasst die **Produktentscheidung** für Markdown-/Node-Hosts zusammen: wann interaktiver Embed, wann statische Grafik, und welche Wrapper es im Repo gibt.

## Festgelegte Strategie

| Szenario | Empfohlenes Format | Wrapper / Tooling |
|----------|-------------------|-------------------|
| Glossary, Hotspots, View-Tabs, Zoom, Vollbild | **`.e2.json`** (v2) | iframe, ` ```e2 `, `![…](board.e2.json)`, `E2BoardEmbed` |
| Druck, PDF, sehr schnelle Ladezeit, kein JS | **SVG / PNG** (Export) | `![](board.drawio.svg)`, `e2-render` CLI |
| Git-native Diagrammtext | Mermaid / PlantUML / E2V | Host-Renderer; **kein** E2-Runtime |
| KI / Diff | E2V, AI-Context-JSON | Import in E2, nicht für Leser-UI |

**Default für Dokumentations-Apps mit vollem Board-Inhalt:** interaktiver Embed um die JSON-Datei — kein separates proprietäres „E2-Grafikformat“.

## Wrapper (implementiert)

| Wrapper | Markdown-Syntax | Modul |
|---------|-----------------|-------|
| Code-Fence | ` ```e2 ` + Pfad/URL | [`markdown-it-e2.mjs`](../src/embed/markdown-it-e2.mjs) |
| Bild-Link | `![Titel](/pfad/board.e2.json)` | gleiches Plugin (`e2ImageLinks`, Standard: an) |
| React | MDX-Komponente | [`E2BoardEmbed`](../src/components/e2-board-embed.tsx) |
| iframe | manuell | `/embed/?board=…` |
| Statische Vorschau | `![…](board.drawio.svg)` | [`e2-render`](../scripts/e2-render.ts) |

Ausführliche Einbindung: [EMBED.md](EMBED.md).

## Statische Grafik-Pipeline

1. Quelle: `board.e2.json`
2. Build-Schritt:

```bash
npm install github:abx-git/E2
npx tsx node_modules/event-storming-tool/scripts/e2-render.ts models/flow.e2.json -o models/flow.drawio.svg
# optional PNG (Playwright): -o models/flow.png
```

3. Markdown:

```markdown
![Domain flow](/models/flow.drawio.svg)
```

SVG ist ein **visueller Schnappschuss** der aktiven Canvas-View (kein Glossary-Panel, keine View-Navigation).

## CORS für interaktive Embeds

Die Embed-iframe lädt `board` per `fetch`. Die JSON-URL muss **`Access-Control-Allow-Origin`** für die Embed-Origin erlauben (oder same-origin mit deiner Docs-Site).

- Lokale Entwicklung: statischer Server mit CORS (siehe `e2-viewer` Datei-Server)
- GitHub Pages: JSON unter derselben Origin wie die Docs ablegen

## Beispiel-Host

Minimales Node-Beispiel: [`examples/markdown-host/`](../examples/markdown-host/README.md).

## Bundle (optional, manuell)

Kein Standard-Format im Repo; empfohlenes Muster für Static Sites:

```
models/order.e2.bundle/
  board.e2.json      # kanonisch
  preview.drawio.svg # von e2-render
  manifest.json      # { "title", "activeViewId", "schema" }
```

Host rendert interaktiv mit JSON, zeigt Vorschau mit SVG.

## Siehe auch

- [BOARD-JSON-SCHEMA.md](BOARD-JSON-SCHEMA.md) — kanonisches JSON
- [VIEWER.md](VIEWER.md) — npm CLI `e2-viewer`
