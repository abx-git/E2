#!/usr/bin/env node
/**
 * E2 viewer CLI — serves a `.e2.json` with CORS and starts the Next.js app.
 *
 * Install:
 *   npm install -g github:abx-git/E2
 *   npm install -g event-storming-tool
 *
 * Usage:
 *   e2-viewer [path/to/board.e2.json]
 *   npx e2-viewer path/to/board.e2.json
 *
 * Options (env):
 *   E2_VIEWER_FILE_PORT   — board file HTTP port (default 41731)
 *   E2_VIEWER_APP_PORT    — Next dev port (default 3000)
 *   E2_VIEWER_NO_BROWSER  — set to 1 to skip opening the browser
 */

import { spawn, spawnSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageRoot = resolve(__dirname, "..");

const FILE_PORT = Number(process.env.E2_VIEWER_FILE_PORT || 41731);
const APP_PORT = Number(process.env.E2_VIEWER_APP_PORT || 3000);
const NO_BROWSER = process.env.E2_VIEWER_NO_BROWSER === "1";

const BOARD_AUTO_LOAD_PARAM = "boardAutoLoad";
const BOARD_URL_PARAM = "board";

function usage(exitCode = 0) {
  const msg = `E2 Viewer — installable board viewer (full view tabs, editor)

Install from GitHub:
  npm install -g github:abx-git/E2
  npm install github:abx-git/E2          # project-local → npx e2-viewer

Install from npm (after publish):
  npm install -g event-storming-tool

Usage:
  e2-viewer [path/to/board.e2.json]
  npx e2-viewer path/to/board.e2.json

Without a file path, starts the app (open via Data → Open or ?board=).

Environment:
  E2_VIEWER_FILE_PORT=${FILE_PORT}
  E2_VIEWER_APP_PORT=${APP_PORT}
  E2_VIEWER_NO_BROWSER=1   skip opening the browser
`;
  process.stderr.write(msg);
  process.exit(exitCode);
}

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  usage(0);
}

const fileArg = process.argv.slice(2).find((a) => !a.startsWith("-"));
let boardPath = null;

if (fileArg) {
  boardPath = resolve(process.cwd(), fileArg);
  if (!existsSync(boardPath)) {
    console.error(`File not found: ${boardPath}`);
    process.exit(1);
  }
  const st = statSync(boardPath);
  if (!st.isFile()) {
    console.error(`Not a file: ${boardPath}`);
    process.exit(1);
  }
  const ext = extname(boardPath).toLowerCase();
  if (ext !== ".json" && !boardPath.toLowerCase().endsWith(".e2.json")) {
    console.warn(`Warning: expected .e2.json or .json, got ${ext || "(no extension)"}`);
  }
  try {
    const head = readFileSync(boardPath, "utf8").slice(0, 2048);
    if (!head.includes("event-storming-tool")) {
      console.warn("Warning: file may not be an E2 board export (missing format marker).");
    }
  } catch (err) {
    console.error(`Cannot read file: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

/** @type {import("node:http").Server | null} */
let fileServer = null;

function resolveNextBin(root) {
  const requireFromPkg = createRequire(resolve(root, "package.json"));
  try {
    const nextPkg = requireFromPkg.resolve("next/package.json");
    return resolve(dirname(nextPkg), "dist/bin/next");
  } catch {
    return resolve(root, "node_modules/next/dist/bin/next");
  }
}

function ensurePackageDependencies(root) {
  const nextBin = resolveNextBin(root);
  if (existsSync(nextBin)) return nextBin;

  console.log("E2 dependencies missing — running npm install in package directory…");
  console.log(`  ${root}\n`);

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const install = spawnSync(
    npmCmd,
    ["install", "--omit=optional", "--no-audit", "--no-fund"],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    },
  );

  if (install.status !== 0) {
    console.error(
      "npm install failed. Clone https://github.com/abx-git/E2 or run:\n" +
        `  cd "${root}" && npm install`,
    );
    process.exit(install.status ?? 1);
  }

  const after = resolveNextBin(root);
  if (!existsSync(after)) {
    console.error(`Next.js not found after install. Expected: ${after}`);
    process.exit(1);
  }
  return after;
}

function startFileServer(absolutePath) {
  const fileName = basename(absolutePath);
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${FILE_PORT}`);
      if (url.pathname !== `/${encodeURIComponent(fileName)}` && url.pathname !== `/${fileName}`) {
        res.writeHead(404, {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end("Not found. Use /" + fileName);
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      createReadStream(absolutePath).pipe(res);
    });
    server.on("error", reject);
    server.listen(FILE_PORT, "127.0.0.1", () => {
      fileServer = server;
      resolvePromise(server);
    });
  });
}

function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolvePromise, reject) => {
    const tick = () => {
      fetch(url, { method: "GET" })
        .then((r) => {
          if (r.ok || r.status === 404) resolvePromise();
          else if (Date.now() > deadline) reject(new Error(`Timeout waiting for ${url}`));
          else setTimeout(tick, 400);
        })
        .catch(() => {
          if (Date.now() > deadline) reject(new Error(`Timeout waiting for ${url}`));
          else setTimeout(tick, 400);
        });
    };
    tick();
  });
}

function openBrowser(url) {
  if (NO_BROWSER) return;
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? ["open", url]
      : platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  spawn(cmd[0], cmd.slice(1), { stdio: "ignore", detached: true }).unref();
}

function shutdown(code = 0) {
  if (fileServer) {
    fileServer.close();
    fileServer = null;
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

/** @type {import("node:child_process").ChildProcess | null} */
let nextProc = null;

async function main() {
  let boardUrl = null;
  if (boardPath) {
    await startFileServer(boardPath);
    const fileName = basename(boardPath);
    boardUrl = `http://127.0.0.1:${FILE_PORT}/${encodeURIComponent(fileName)}`;
    console.log(`Serving board: ${boardPath}`);
    console.log(`  → ${boardUrl}`);
  }

  const nextBin = ensurePackageDependencies(packageRoot);

  nextProc = spawn(process.execPath, [nextBin, "dev", "-p", String(APP_PORT)], {
    cwd: packageRoot,
    stdio: "inherit",
    env: { ...process.env, PORT: String(APP_PORT) },
  });

  nextProc.on("exit", (code) => {
    shutdown(code ?? 0);
  });

  const appOrigin = `http://127.0.0.1:${APP_PORT}`;
  try {
    await waitForHttp(`${appOrigin}/`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    shutdown(1);
    return;
  }

  if (boardUrl) {
    const params = new URLSearchParams();
    params.set(BOARD_URL_PARAM, boardUrl);
    params.set(BOARD_AUTO_LOAD_PARAM, "1");
    const openUrl = `${appOrigin}/?${params.toString()}`;
    console.log(`\nE2 viewer ready:\n  ${openUrl}\n`);
    console.log("Full view tabs (canvas, actions, …) are available in the app bar.");
    openBrowser(openUrl);
  } else {
    console.log(`\nE2 dev server: ${appOrigin}/`);
    console.log("Open a .e2.json via Data → Open, or: e2-viewer your-board.e2.json");
    if (!NO_BROWSER) openBrowser(`${appOrigin}/`);
  }
}

main().catch((err) => {
  console.error(err);
  shutdown(1);
});
