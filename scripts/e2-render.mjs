#!/usr/bin/env node
/**
 * Render `.e2.json` to static SVG or PNG for Markdown / PDF pipelines.
 *
 *   npx tsx scripts/e2-render.ts board.e2.json -o board.svg
 *   node scripts/e2-render.mjs board.e2.json -o board.svg   (delegates to tsx)
 *
 * PNG uses Playwright against the public embed URL (optional dependency).
 */

import { spawnSync } from "node:child_process";
import { existsSync, resolve } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const tsScript = resolve(repoRoot, "scripts/e2-render.ts");

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  process.stderr.write(`Usage: e2-render <board.e2.json> -o <out.svg|out.png> [--view <id>]

SVG: headless (no browser), active canvas view only.
PNG: requires \`playwright\` and uses ${process.env.E2_EMBED_ORIGIN ?? "https://abx-git.github.io/E2"}/embed/

Environment:
  E2_EMBED_ORIGIN   embed base for PNG captures
`);
  process.exit(0);
}

const input = args.find((a) => !a.startsWith("-") && a.endsWith(".json"));
if (!input || !existsSync(resolve(process.cwd(), input))) {
  console.error("Usage: e2-render <board.e2.json> -o <output>");
  process.exit(1);
}

const tsx = resolve(repoRoot, "node_modules/tsx/dist/cli.mjs");
const runner = existsSync(tsx) ? process.execPath : "npx";
const runnerArgs = existsSync(tsx)
  ? [tsx, tsScript, ...args]
  : ["tsx", tsScript, ...args];

const result = spawnSync(runner, runnerArgs, { cwd: repoRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
