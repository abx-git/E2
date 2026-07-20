# E2 auf GitHub Pages

Statische Auslieferung der Event-Storming-App über GitHub Pages (kein Node-Server). Persistenz bleibt lokal beim Nutzer (`.storm.json` / File System Access API).

## Übersicht

| Komponente | Wo | Kosten |
|------------|-----|--------|
| E2-App (PWA) | GitHub Pages | kostenlos |
| Arbeitsdatei | beim Nutzer (Browser) | kostenlos |

---

## Schritt 1 — GitHub Pages aktivieren

1. Repository auf **GitHub** (nicht nur lokal).
2. **Settings → Pages → Build and deployment**
3. **Source:** **GitHub Actions**
4. Push auf `main` — Workflow [`.github/workflows/deploy-github-pages.yml`](../.github/workflows/deploy-github-pages.yml) baut und publiziert.

**App-URL:** `https://<github-user>.github.io/<repo-name>/`  
Beispiel: `https://abx-git.github.io/E2/`

> Zeigt die Seite nur README? Pages-Quelle ist falsch — **GitHub Actions** wählen (nicht Branch `main`).

---

## Schritt 2 — App nutzen

Nach dem ersten erfolgreichen Deploy:

1. App-URL im Browser öffnen (Chrome/Edge empfohlen).
2. **Daten** → Arbeitsdatei öffnen oder neu anlegen.

Lokal testen:

```bash
npm run build:static
# Optional anderer Pfad:
# NEXT_PUBLIC_BASE_PATH=/MeinRepo npm run build:static
npx serve out
# → http://localhost:3000/E2/
```

---

## Optional: anderer Base-Pfad

**Settings → Secrets and variables → Actions → Variables**

| Variable | Beispiel | Pflicht |
|----------|----------|---------|
| `NEXT_PUBLIC_BASE_PATH` | `/E2` | nein (Standard: `/` + Repo-Name) |

Nach Änderung Workflow erneut laufen lassen (Push oder **Actions → Deploy GitHub Pages → Run workflow**).

---

## Troubleshooting

| Symptom | Lösung |
|---------|--------|
| Nur README sichtbar | Pages-Quelle auf **GitHub Actions** stellen |
| 404 auf Assets / CSS | `NEXT_PUBLIC_BASE_PATH` muss zum Repo-Namen passen |
| Workflow rot | Actions-Log prüfen; lokal `npm run build:static` testen |
| Arbeitsdatei geht nicht | HTTPS nötig (GitHub Pages OK); Safari/Firefox: Backup/JSON nutzen |
