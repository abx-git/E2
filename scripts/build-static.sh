#!/usr/bin/env bash
# Static export for GitHub Pages / any static host (no Node server).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export E2_BUILD_TARGET=static
export NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/E2}"

echo "→ Static build (basePath=${NEXT_PUBLIC_BASE_PATH}) …"
npx next build

if [[ ! -d "$ROOT/out" ]]; then
  echo "Error: out/ was not created." >&2
  exit 1
fi

if [[ ! -f "$ROOT/out/.nojekyll" ]]; then
  if [[ -f "$ROOT/public/.nojekyll" ]]; then
    cp "$ROOT/public/.nojekyll" "$ROOT/out/.nojekyll"
  else
    touch "$ROOT/out/.nojekyll"
  fi
fi

echo "→ Done: $ROOT/out"
echo "   Preview: npx serve out   then open http://localhost:3000${NEXT_PUBLIC_BASE_PATH}/"
