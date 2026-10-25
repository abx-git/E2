# GitHub Pages deployment

E2 ships as a **static export** suitable for GitHub **Project Pages** (`https://<user>.github.io/<repo>/`).

## One-time setup

1. Repository **Settings → Pages → Build and deployment → Source:** GitHub Actions.
2. Optional: **Settings → Actions → Variables** → `NEXT_PUBLIC_BASE_PATH` = `/YourRepo`  
   (default: `/<repository-name>` from the workflow).

## CI workflow

[`.github/workflows/deploy-github-pages.yml`](../.github/workflows/deploy-github-pages.yml) runs on push to `main` (and `workflow_dispatch`):

1. `npm ci`
2. `npm run build:static` with `NEXT_PUBLIC_BASE_PATH`
3. Verifies `out/.nojekyll`, `out/index.html`, `out/sw.js` (PWA)
4. Uploads `out/` to GitHub Pages

## Local preview

```bash
npm run build:static
npx serve out
# open http://localhost:3000/E2/  (default base path)
```

Override base path when building:

```bash
NEXT_PUBLIC_BASE_PATH=/MyFork npm run build:static
```

## Limitations on Pages

- **No Node middleware** — Supabase cookie refresh via `middleware.ts` does not run; collab uses **anonymous sign-in in the browser** and optional **localStorage** Supabase settings.
- **Collab** requires users to enter Supabase URL/key in the app unless you bake `NEXT_PUBLIC_SUPABASE_*` into the static build at compile time.

See [deployment.md](arc42/deployment.md) for static vs `standalone` hosting.
