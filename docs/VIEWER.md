# E2 Viewer (installable npm module)

The **E2 application is the viewer**: canvas, pan/zoom, multi-tab **views** (including actions/measures views), glossary, facilitator, and exports all run in the same Next.js app (`event-storming-tool`).

Install it from **this repository** or from the **npm registry** (after publish), then start it with the **`e2-viewer`** CLI.

## Installation

### From GitHub (no npm publish required)

Global (recommended for end users):

```bash
npm install -g github:abx-git/E2
e2-viewer path/to/your-board.e2.json
```

In an existing project (no global install):

```bash
npm install github:abx-git/E2
npx e2-viewer path/to/your-board.e2.json
```

Pin a branch or tag:

```bash
npm install -g github:abx-git/E2#cursor/e2-npm-viewer-8c57
```

### From npm registry

After the package is published under the name **`event-storming-tool`**:

```bash
npm install -g event-storming-tool
e2-viewer path/to/your-board.e2.json
```

One-off without global install:

```bash
npx event-storming-tool path/to/your-board.e2.json
```

(`npx` runs the `e2-viewer` / `e2` binary from the package.)

### Clone and develop

```bash
git clone https://github.com/abx-git/E2.git
cd E2
npm install
npm run viewer -- path/to/your-board.e2.json
```

## Quick start (after install)

```bash
e2-viewer path/to/your-board.e2.json
```

This will:

1. Serve your board on `http://127.0.0.1:41731/…` (CORS-enabled, read-only).
2. Start the Next.js dev server on port **3000** (override with `E2_VIEWER_APP_PORT`).
3. Open the browser with `?board=…&boardAutoLoad=1` so an empty session loads the file without an extra click.

Without a file argument:

```bash
e2-viewer
```

Only the app starts — open boards via **Data → Open…** or paste JSON/E2V.

On first run after a **global** install, the CLI may run `npm install` inside the package directory if dependencies are missing.

## Full view capabilities

After load, use the **view tabs** in the app bar to switch between all views in the document (`views[]` in v2 format): canvas boards, **actions** views, and linked navigation. Behaviour matches the hosted app at [abx-git.github.io/E2](https://abx-git.github.io/E2/).

## Other ways to open a board

| Method | When |
|--------|------|
| **Data → Open…** | Local file via File System Access API |
| **`?board=<https-url>`** | Remote `.e2.json` (HTTPS or localhost HTTP); confirm in dialog unless `boardAutoLoad=1` and board is empty |
| **Paste** | JSON or E2V in the Data panel |
| **Hosted** | [GitHub Pages build](GITHUB-PAGES.md) — `npm run build:static` then `npx serve out` |

Remote URLs must allow **CORS** from your app origin (the local file server in `e2-viewer` sets `Access-Control-Allow-Origin: *`).

## Publishing to npm (maintainers)

1. Bump `version` in `package.json`.
2. `npm login`
3. `npm publish --access public` (unscoped package)

The `files` field limits the tarball to the app + CLI (no `docs/`, tests, or CI). `prepack` runs a small smoke test.

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `E2_VIEWER_FILE_PORT` | `41731` | Port for the local board JSON server |
| `E2_VIEWER_APP_PORT` | `3000` | Next.js dev port |
| `E2_VIEWER_NO_BROWSER` | unset | Set to `1` to skip opening the browser |

## Schemas

Board format: [BOARD-JSON-SCHEMA.md](BOARD-JSON-SCHEMA.md) and `public/schemas/board-snapshot-v2.schema.json`.
