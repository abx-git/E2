# E2 embed — host protocol (v1)

When E2 runs inside an iframe (`/embed/?embed=1`) and a **parent** app owns the `.e2.json` on disk (e.g. fsidx), use this protocol instead of E2 working-file autosave.

Set allowed parent origins on the embed URL:

```
https://abx-git.github.io/E2/embed/?embed=1&editable=1&parentOrigin=https%3A%2F%2Fyour-app.example
```

## Messages

| `type` | Direction | Purpose |
|--------|-----------|---------|
| `e2/embed-ready` | child → parent | `{ hostProtocol: 1 }` — child is listening |
| `e2/embed-load` | parent → child | `{ json, hostFileId, editable?, autosave? }` |
| `e2/embed-document` | child → parent | `{ json, hostFileId, revision, reason: "autosave" \| "flush" }` |
| `e2/embed-request-save` | parent → child | `{ hostFileId? }` — immediate export before file switch |
| `e2/embed-save-ack` | parent → child | `{ hostFileId, ok, error? }` — after persisting to disk |
| `e2/embed-dirty` | child → parent | `{ hostFileId, dirty }` — optional UI hint |

**Origin:** The embed page validates `event.origin` against `parentOrigin` query (comma-separated allowlist). Empty allowlist = legacy permissive mode.

**Autosave:** ~1.5s debounce after store changes when `editable` and `autosave` are true. Working-file disk persistence stays paused.

## fsidx example (sketch)

```javascript
iframe.onload = () => { /* wait for embed-ready */ };

window.addEventListener("message", (evt) => {
  if (evt.origin !== E2_ORIGIN) return;
  if (evt.data?.type === "e2/embed-ready") {
    iframe.contentWindow.postMessage(
      {
        type: "e2/embed-load",
        json: boardText,
        hostFileId: relativePath,
        editable: true,
      },
      E2_ORIGIN,
    );
  }
  if (evt.data?.type === "e2/embed-document") {
    await writeFile(relativePath, evt.data.json);
    iframe.contentWindow.postMessage(
      { type: "e2/embed-save-ack", hostFileId: evt.data.hostFileId, ok: true },
      E2_ORIGIN,
    );
  }
});
```

See also: [EMBED.md](EMBED.md).