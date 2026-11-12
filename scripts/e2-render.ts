import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import {
  buildHeadlessBoardExport,
  defaultOutPathForFormat,
  inferRenderFormatFromOutPath,
  isHeadlessExportFormat,
  type CliRenderFormat,
} from "../src/lib/cli-board-export";
import { boardImportPayloadFromAnyExportText } from "../src/lib/board-import-text";
import { boardImportPayloadFromExportText } from "../src/lib/storm-json";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let out: string | undefined;
  let viewId: string | undefined;
  let format: CliRenderFormat | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--out") {
      out = argv[++i];
      continue;
    }
    if (a === "--view") {
      viewId = argv[++i];
      continue;
    }
    if (a === "--format") {
      const f = argv[++i]?.toLowerCase();
      if (f === "svg" || f === "png" || f === "e2v" || f === "json") format = f;
      continue;
    }
    if (!a.startsWith("-")) positional.push(a);
  }
  const input = positional[0];
  if (!input) throw new Error("Missing input .e2.json");
  if (out && !format) {
    format = inferRenderFormatFromOutPath(out) ?? "svg";
  }
  format ??= "svg";
  return { input, out, viewId, format };
}

async function renderPng(inputPath: string, outPath: string, boardUrl: string, embedOrigin: string) {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "PNG export requires `playwright`. Install with: npm install -D playwright && npx playwright install chromium",
    );
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const url = new URL(`${embedOrigin.replace(/\/$/, "")}/embed/`);
    url.searchParams.set("board", boardUrl);
    url.searchParams.set("boardAutoLoad", "1");
    url.searchParams.set("embed", "1");
    await page.goto(url.toString(), { waitUntil: "networkidle", timeout: 120_000 });
    const canvas = page.locator(".dock-surface").nth(1);
    await canvas.waitFor({ state: "visible", timeout: 60_000 });
    mkdirSync(dirname(outPath), { recursive: true });
    await canvas.screenshot({ path: outPath, type: "png" });
  } finally {
    await browser.close();
  }
}

async function main() {
  const { input, out, viewId, format } = parseArgs(process.argv.slice(2));
  const absIn = resolve(process.cwd(), input);
  if (!existsSync(absIn)) throw new Error(`File not found: ${absIn}`);

  const json = readFileSync(absIn, "utf8");
  const doc = boardImportPayloadFromExportText(json) ?? boardImportPayloadFromAnyExportText(json);
  if (!doc) {
    throw new Error("Invalid E2 board JSON");
  }

  const inputStem = basename(absIn);
  const defaultOut = resolve(process.cwd(), defaultOutPathForFormat(inputStem, format));
  const absOut = resolve(process.cwd(), out ?? defaultOut);
  mkdirSync(dirname(absOut), { recursive: true });

  if (format === "png") {
    const { createServer } = await import("node:http");
    const { createReadStream } = await import("node:fs");
    const fileName = basename(absIn);
    const port = 41732;
    await new Promise<void>((resolvePromise, reject) => {
      const server = createServer((req, res) => {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        createReadStream(absIn).pipe(res);
      });
      server.on("error", reject);
      server.listen(port, "127.0.0.1", async () => {
        try {
          const boardUrl = `http://127.0.0.1:${port}/${encodeURIComponent(fileName)}`;
          const embedOrigin = process.env.E2_EMBED_ORIGIN ?? "https://abx-git.github.io/E2";
          await renderPng(absIn, absOut, boardUrl, embedOrigin);
          console.log(`Wrote ${absOut}`);
        } finally {
          server.close(() => resolvePromise());
        }
      });
    });
    return;
  }

  if (!isHeadlessExportFormat(format)) {
    throw new Error(`Unsupported format: ${format}`);
  }

  const result = buildHeadlessBoardExport(doc, { format, viewId });
  if (!result.ok) {
    throw new Error(result.reason);
  }
  writeFileSync(absOut, result.body, "utf8");
  console.log(`Wrote ${absOut}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
