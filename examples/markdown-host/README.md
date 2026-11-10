# Minimal Markdown host (Node)

Renders Markdown with **E2 interaktive Embeds** via markdown-it.

```bash
cd examples/markdown-host
npm install
node render.mjs
```

Output: `dist/page.html` — open in a browser. Board JSON must be served with CORS in production; this demo uses paths resolved with `siteOrigin`.

Edit `sample.md` to try:

- ` ```e2 ` fence
- `![Board](../path/to/board.e2.json)` image wrapper

Configure `embedOrigin` in `render.mjs` (default: GitHub Pages E2).
