# E2 in Markdown & Node applications

**Format choice (interaktiv vs. statisch):** [MARKDOWN-FORMATS.md](MARKDOWN-FORMATS.md)

Embed **full E2 boards** (pan/zoom, focus highlight, search, glossary, hotspots, multi-tab views, actions views) inside apps that render Markdown — without reimplementing the canvas.

## Choose an integration

| Host | Approach |
|------|----------|
| **React / Next.js / MDX** | `E2BoardEmbed` component (`event-storming-tool/embed`) |
| **markdown-it (Node)** | `markdown-it-e2` fence plugin |
| **Any HTML** | `<iframe src="…/embed/?board=…">` |

For **several boards on one page**, use **iframe** (or multiple iframes). The in-app Zustand store holds one document per JavaScript context.

## React / MDX

Install from GitHub or npm (see [VIEWER.md](VIEWER.md)):

```bash
npm install github:abx-git/E2
```

In a client component or MDX:

```tsx
"use client";

import { E2BoardEmbed } from "event-storming-tool/embed";

export function ArchitectureSection() {
  return (
    <E2BoardEmbed
      src="/docs/models/order-flow.e2.json"
      height="32rem"
      locale="de"
      fullscreenOnClick
    />
  );
}
```

Or inline JSON (string from `fs.readFile` at build time):

```tsx
<E2BoardEmbed document={boardJson} height={480} />
```

Props:

| Prop | Meaning |
|------|---------|
| `src` | Remote or same-origin URL to `.e2.json` |
| `document` | Raw JSON text |
| `payload` | Parsed v2 payload object |
| `editable` | `true` allows sticky drag/edit; default `false` (view mode) |
| `fullscreenOnClick` | Double-click canvas → fullscreen (default `true`) |
| `height` | Inline size (default `28rem`) |
| `locale` | `de` \| `en` |

**Styling:** import E2 globals in your host app (`src/app/globals.css` from this repo) or mount inside an iframe.

**Path alias:** when linking the repo as source, map `@/*` to `node_modules/event-storming-tool/src/*` in your bundler, or copy the embed components into your app.

## markdown-it (Node)

```javascript
import markdownit from "markdown-it";
import e2Fence from "event-storming-tool/embed/markdown-it";

const md = markdownit().use(e2Fence, {
  embedOrigin: "https://abx-git.github.io/E2", // or http://127.0.0.1:3000
  siteOrigin: "https://my-docs.example",       // resolve /relative/board.e2.json
  height: "30rem",
});

const html = md.render(`
# Domain model

\`\`\`e2
/docs/order.e2.json
\`\`\`

![Order flow](/docs/order.e2.json)
`);
```

- Fence info `e2 editable` enables sticky editing inside the iframe.
- Links to `*.e2.json` in `![…](…)` are rewritten to the same iframe embed (`e2ImageLinks`, default on).

Example project: [`examples/markdown-host/`](../examples/markdown-host/README.md).

**Static image:** [`e2-render`](../scripts/e2-render.ts) → SVG/PNG — see [MARKDOWN-FORMATS.md](MARKDOWN-FORMATS.md).

The plugin emits an **iframe** to `/embed/?board=…&boardAutoLoad=1&embed=1` — same UI as the hosted app, scoped to the embed layout (view tabs + canvas + side rail).

## iframe URL (manual)

```
https://abx-git.github.io/E2/embed/?board=https%3A%2F%2Fcdn.example%2Fboard.e2.json&boardAutoLoad=1&embed=1
```

| Param | Purpose |
|-------|---------|
| `board` | Board JSON URL (CORS required) |
| `boardAutoLoad` | `1` — load without confirm |
| `embed` | `1` — embed layout |
| `editable` | `1` — edit mode |

**Inline JSON via postMessage** (after iframe load):

```javascript
iframe.contentWindow.postMessage(
  { type: "e2/embed-load", json: fs.readFileSync("board.e2.json", "utf8") },
  "*",
);
```

Or use `window.e2SendInlineBoard(iframe, json)` from [`public/embed-host.js`](../public/embed-host.js).

## What's included in embed mode

- All **views** from the JSON (`views[]`, canvas + actions)
- Canvas **pan/zoom**, selection, **focus mode**, search/filter (canvas toolbar)
- **Glossary**, **hotspots**, bookmarks, element inspector (side rail)
- **Fullscreen** (app bar control + double-click canvas)
- Default **view** interaction mode (no accidental drags); opt into `editable`

Not included: working file autosave, backup, collab rooms, data storage panel — use the full app for authoring workflows.

## GitHub Pages base path

Hosted at `https://abx-git.github.io/E2/`:

- Embed route: `https://abx-git.github.io/E2/embed/`
- Set `embedOrigin: "https://abx-git.github.io/E2"` in markdown-it options.

## Package exports

```json
"event-storming-tool/embed"
"event-storming-tool/embed/markdown-it"
```

See [VIEWER.md](VIEWER.md) for running the full editor locally.
