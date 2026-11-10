import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../..");

async function main() {
  const markdownit = (await import("markdown-it")).default;
  const e2Fence = (await import("../../src/embed/markdown-it-e2.mjs")).default;

  const md = markdownit({ html: true, linkify: true }).use(e2Fence, {
    embedOrigin: process.env.E2_EMBED_ORIGIN ?? "https://abx-git.github.io/E2",
    siteOrigin: process.env.E2_SITE_ORIGIN ?? "https://example.com",
    height: "24rem",
  });

  const sample = `# Architecture doc

Interactive board (e2 fence):

\`\`\`e2
/docs/order.e2.json
\`\`\`

Image wrapper to the same board:

![Order flow](/docs/order.e2.json)

Static preview (after \`e2-render\`):

![Preview](/docs/order.drawio.svg)
`;

  const body = md.render(sample);
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <title>E2 markdown-host sample</title>
  <style>body{font-family:system-ui,sans-serif;max-width:48rem;margin:2rem auto;line-height:1.5}</style>
</head>
<body>${body}</body>
</html>`;

  const out = resolve(__dirname, "dist/page.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
