# E2 Viewer (local npm)

The **E2 application is the viewer**: canvas, pan/zoom, multi-tab **views** (including actions/measures views), glossary, facilitator, and exports all run in the same Next.js app (`event-storming-tool`).

Use this guide when you want to **start the viewer via npm** and open a local `.e2.json` with full view capabilities.

## Quick start

```bash
npm install
npm run viewer -- path/to/your-board.e2.json
```

This will:

1. Serve your board on `http://127.0.0.1:41731/…` (CORS-enabled, read-only).
2. Start `next dev` on port **3000** (override with `E2_VIEWER_APP_PORT`).
3. Open the browser with `?board=…&boardAutoLoad=1` so an empty session loads the file without an extra click.

Without a file argument:

```bash
npm run viewer
```

Only the dev server starts — open boards via **Data → Open…** or paste JSON/E2V.

## Full view capabilities

After load, use the **view tabs** in the app bar (`BoardViewTabs`) to switch between all views in the document (`views[]` in v2 format): canvas boards, **actions** views, and linked navigation. Behaviour matches the hosted app at [abx-git.github.io/E2](https://abx-git.github.io/E2/).

## Other ways to open a board

| Method | When |
|--------|------|
| **Data → Open…** | Local file via File System Access API |
| **`?board=<https-url>`** | Remote `.e2.json` (HTTPS or localhost HTTP); confirm in dialog unless `boardAutoLoad=1` and board is empty |
| **Paste** | JSON or E2V in the Data panel |
| **Hosted** | [GitHub Pages build](GITHUB-PAGES.md) — `npm run build:static` then `npx serve out` |

Remote URLs must allow **CORS** from your app origin (the local file server in `npm run viewer` sets `Access-Control-Allow-Origin: *`).

## Production / demo build

```bash
npm run build
npm run start
```

In another terminal, serve a board and open:

`http://127.0.0.1:3000/?board=http://127.0.0.1:41731/board.e2.json&boardAutoLoad=1`

(start the file server manually or reuse `node scripts/e2-viewer.mjs` with `E2_VIEWER_NO_BROWSER=1` and stop the dev part — for production, run your own static JSON host.)

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `E2_VIEWER_FILE_PORT` | `41731` | Port for the local board JSON server |
| `E2_VIEWER_APP_PORT` | `3000` | Next.js dev port |
| `E2_VIEWER_NO_BROWSER` | unset | Set to `1` to skip opening the browser |

## Schemas

Board format: [BOARD-JSON-SCHEMA.md](BOARD-JSON-SCHEMA.md) and `public/schemas/board-snapshot-v2.schema.json`.
