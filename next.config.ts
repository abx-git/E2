import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const isStaticExport = process.env.E2_BUILD_TARGET === "static";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? (isStaticExport ? "/E2" : "")).replace(/\/$/, "");

function buildRevision(): string {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  if (git.status === 0 && git.stdout?.trim()) return git.stdout.trim();
  return randomUUID();
}

const offlinePath = `${basePath}/~offline`.replace(/\/{2,}/g, "/") || "/~offline";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: offlinePath, revision: buildRevision() }],
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        output: "standalone",
      }),
};

export default withSerwist(nextConfig);
