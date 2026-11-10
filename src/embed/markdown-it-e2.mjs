/**
 * markdown-it plugin: render ```e2 fenced blocks as iframe embed hosts.
 *
 * Fence body: HTTPS URL, site-relative path, or file:// resolved by your static server.
 *
 * @example
 * import markdownit from "markdown-it";
 * import e2Fence from "event-storming-tool/embed/markdown-it";
 * const md = markdownit().use(e2Fence, { embedOrigin: "https://abx-git.github.io/E2" });
 */

const DEFAULT_ORIGIN = "https://abx-git.github.io/E2";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveBoardSrc(raw, opts) {
  const line = raw.trim().split("\n")[0]?.trim() ?? "";
  if (!line) return null;
  if (/^https?:\/\//i.test(line)) return line;
  if (line.startsWith("/")) {
    const site = (opts.siteOrigin ?? "").replace(/\/$/, "");
    return site ? `${site}${line}` : line;
  }
  return line;
}

function buildEmbedUrl(embedOrigin, boardSrc, extraParams = {}) {
  const base = embedOrigin.replace(/\/$/, "");
  const url = new URL(`${base}/embed/`);
  url.searchParams.set("board", boardSrc);
  url.searchParams.set("boardAutoLoad", "1");
  url.searchParams.set("embed", "1");
  for (const [key, value] of Object.entries(extraParams)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isE2JsonRef(href) {
  return /\.e2\.json(?:[?#].*)?$/i.test(href.trim());
}

function renderEmbedIframe(embedOrigin, boardSrc, opts, extraParams = {}) {
  const height = opts.height ?? "28rem";
  const iframeSrc = buildEmbedUrl(embedOrigin, boardSrc, extraParams);
  return `
<div class="e2-embed-host" data-e2-height="${escapeHtml(height)}" style="height:${escapeHtml(height)};width:100%;min-height:16rem;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <iframe
    class="e2-embed-frame"
    src="${escapeHtml(iframeSrc)}"
    title="E2 board"
    style="width:100%;height:100%;border:0"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    allow="clipboard-read; clipboard-write"
  ></iframe>
</div>`;
}

/**
 * @param {import("markdown-it")} md
 * @param {{ embedOrigin?: string; siteOrigin?: string; height?: string; loadScript?: boolean; e2ImageLinks?: boolean }} [opts]
 */
export default function markdownItE2Fence(md, opts = {}) {
  const embedOrigin = opts.embedOrigin ?? DEFAULT_ORIGIN;
  const height = opts.height ?? "28rem";
  const loadScript = opts.loadScript === true;
  const e2ImageLinks = opts.e2ImageLinks !== false;

  const defaultFence = md.renderer.rules.fence;
  const defaultImage = md.renderer.rules.image;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim().split(/\s+/)[0];
    if (info !== "e2") {
      return defaultFence(tokens, idx, options, env, self);
    }

    const boardSrc = resolveBoardSrc(token.content, opts);
    if (!boardSrc) {
      return `<p class="e2-embed-error">Empty e2 fence — add a board URL or path.</p>`;
    }

    const attrs = token.info.trim().split(/\s+/).slice(1);
    const editable = attrs.includes("editable") ? { editable: "1" } : {};
    let html = renderEmbedIframe(embedOrigin, boardSrc, opts, editable);

    if (!loadScript) return html;

    const script =
      `<script src="${escapeHtml(embedOrigin.replace(/\/$/, ""))}/embed-host.js" defer></script>`;
    return html + script;
  };

  if (e2ImageLinks) {
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const src = token.attrGet("src") ?? "";
      if (!isE2JsonRef(src)) {
        return defaultImage(tokens, idx, options, env, self);
      }
      const boardSrc = resolveBoardSrc(src, opts) ?? src;
      return renderEmbedIframe(embedOrigin, boardSrc, { ...opts, height });
    };
  }
}
