import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

import { boardExportSliceFromJson } from "../src/lib/board-export-from-document";
import { boardImportPayloadFromAnyExportText } from "../src/lib/board-import-text";
import { buildBoardSvgString } from "../src/lib/storm-export";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let out: string | undefined;
  let viewId: string | undefined;
  let format: "svg" | "png" | undefined;

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
      const f = argv[++i];
      if (f === "svg" || f === "png") format = f;
      continue;
    }
    if (!a.startsWith("-")) positional.push(a);
  }
  const input = positional[0];
  if (!input) throw new Error("Missing input .e2.json");
  if (out && !format) {
    format = extname(out).toLowerCase() === ".png" ? "png" : "svg";
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
  if (!boardImportPayloadFromAnyExportText(json)) {
    throw new Error("Invalid E2 board JSON");
  }

  const defaultOut = resolve(
    process.cwd(),
    basename(absIn).replace(/\.e2\.json$/i, "").replace(/\.json$/i, "") + (format === "png" ? ".png" : ".drawio.svg"),
  );
  const absOut = resolve(process.cwd(), out ?? defaultOut);
  mkdirSync(dirname(absOut), { recursive: true });

  if (format === "svg") {
    const slice = boardExportSliceFromJson(json, { viewId });
    if (!slice) {
      throw new Error(
        viewId
          ? `View ${viewId} is not a canvas view or does not exist`
          : "No canvas view to export (actions-only document?)",
      );
    }
    const svg = buildBoardSvgString(slice);
    writeFileSync(absOut, svg, "utf8");
    console.log(`Wrote ${absOut}`);
    return;
  }

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
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
