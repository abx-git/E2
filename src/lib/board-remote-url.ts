/**
 * Share / open a remote `.storm.json` via `?board=<https-url>`.
 * Validation uses the same import path as local export (v1/v2 snapshots).
 */

import { boardImportPayloadFromExportText, type BoardImportPayload } from "@/lib/storm-json";
import { normalizeExternalUrl } from "@/lib/board-link";

export const BOARD_URL_PARAM = "board";

export type BoardSourceUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/** Allow https; http only for localhost / loopback (dev). */
export function checkBoardSourceUrl(raw: string): BoardSourceUrlCheck {
  const normalized = normalizeExternalUrl(raw.trim());
  if (!normalized) {
    return { ok: false, reason: "Keine gültige http(s)-URL." };
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, reason: "Keine gültige http(s)-URL." };
  }
  if (parsed.protocol === "https:") {
    return { ok: true, url: normalized };
  }
  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  if (parsed.protocol === "http:" && isLocal) {
    return { ok: true, url: normalized };
  }
  return {
    ok: false,
    reason: "Nur HTTPS-URLs (oder http://localhost) sind erlaubt.",
  };
}

export function readBoardUrlFromSearch(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get(BOARD_URL_PARAM)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

/** Build an app URL that opens E2 and loads the given remote board JSON. */
export function buildBoardShareAppUrl(
  boardSourceUrl: string,
  appHref = typeof window !== "undefined" ? window.location.href : "",
): string {
  if (!appHref) {
    return `?${BOARD_URL_PARAM}=${encodeURIComponent(boardSourceUrl)}`;
  }
  const url = new URL(appHref);
  url.searchParams.set(BOARD_URL_PARAM, boardSourceUrl);
  return url.toString();
}

export function stripBoardUrlParamFromLocation(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(BOARD_URL_PARAM)) return;
  url.searchParams.delete(BOARD_URL_PARAM);
  window.history.replaceState({}, "", url.toString());
}

export type RemoteBoardValidateOk = {
  ok: true;
  sourceUrl: string;
  shareUrl: string;
  title: string;
  viewCount: number;
  elementCount: number;
  payload: BoardImportPayload;
  rawText: string;
};

export type RemoteBoardValidateFail = {
  ok: false;
  reason: string;
};

export type RemoteBoardValidateResult = RemoteBoardValidateOk | RemoteBoardValidateFail;

function summarizePayload(payload: BoardImportPayload): {
  title: string;
  viewCount: number;
  elementCount: number;
} {
  const viewCount = payload.views.length;
  const elementCount = payload.views.reduce((n, v) => n + v.elements.length, 0);
  return {
    title: payload.title?.trim() || "Unbenanntes Board",
    viewCount,
    elementCount,
  };
}

/**
 * Fetch a remote URL and check it parses as an E2 board snapshot (schema-compatible).
 * CORS must allow the E2 origin; network/CORS failures surface as a clear reason.
 */
export async function fetchAndValidateRemoteBoard(
  rawUrl: string,
  opts?: { signal?: AbortSignal; appHref?: string },
): Promise<RemoteBoardValidateResult> {
  const checked = checkBoardSourceUrl(rawUrl);
  if (!checked.ok) return checked;

  let response: Response;
  try {
    response = await fetch(checked.url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal: opts?.signal,
      headers: { Accept: "application/json, text/plain, */*" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts?.signal?.aborted || /abort/i.test(msg)) {
      return { ok: false, reason: "Prüfung abgebrochen." };
    }
    return {
      ok: false,
      reason:
        "Datei konnte nicht geladen werden (Netzwerk oder CORS). Die Quelle muss Cross-Origin-Zugriff von E2 erlauben.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: `HTTP ${response.status} — Datei nicht erreichbar.`,
    };
  }

  let rawText: string;
  try {
    rawText = await response.text();
  } catch {
    return { ok: false, reason: "Antwort konnte nicht gelesen werden." };
  }

  if (!rawText.trim()) {
    return { ok: false, reason: "Die Datei ist leer." };
  }

  const payload = boardImportPayloadFromExportText(rawText);
  if (!payload) {
    return {
      ok: false,
      reason:
        "Kein gültiges E2-Board (.storm.json). Format/Version passen nicht zum Schema.",
    };
  }

  const summary = summarizePayload(payload);
  return {
    ok: true,
    sourceUrl: checked.url,
    shareUrl: buildBoardShareAppUrl(checked.url, opts?.appHref),
    title: summary.title,
    viewCount: summary.viewCount,
    elementCount: summary.elementCount,
    payload,
    rawText,
  };
}
