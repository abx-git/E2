#!/usr/bin/env bash
# Statischer Export für GitHub Pages / beliebigen Static-Host (kein Node-Server).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export E2_BUILD_TARGET=static
export NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/E2}"

echo "→ Statischer Build (basePath=${NEXT_PUBLIC_BASE_PATH}) …"
npx next build

if [[ ! -d "$ROOT/out" ]]; then
  echo "Fehler: out/ wurde nicht erzeugt." >&2
  exit 1
fi

if [[ ! -f "$ROOT/out/.nojekyll" ]]; then
  if [[ -f "$ROOT/public/.nojekyll" ]]; then
    cp "$ROOT/public/.nojekyll" "$ROOT/out/.nojekyll"
  else
    touch "$ROOT/out/.nojekyll"
  fi
fi

echo "→ Fertig: $ROOT/out"
echo "   Vorschau: npx serve out   dann Browser: http://localhost:3000${NEXT_PUBLIC_BASE_PATH}/"
