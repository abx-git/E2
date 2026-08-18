import type { StormElement } from "@/types/storm-element";
import { useStormBoardStore } from "@/store/storm-board-store";

/** Normalize user input into an absolute http(s) URL, or null if empty/invalid. */
export function normalizeExternalUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function linkHasTarget(el: StormElement): boolean {
  const kind = el.metadata?.linkKind ?? "external";
  if (kind === "view") return Boolean(el.metadata?.linkViewId?.trim());
  return Boolean(normalizeExternalUrl(el.metadata?.linkUrl));
}

/** Short destination label for link chips (URL host/path or view name). */
export function linkDestinationPreview(
  el: StormElement,
  opts?: { viewNameById?: Record<string, string> },
): string | null {
  const kind = el.metadata?.linkKind ?? "external";
  if (kind === "view") {
    const viewId = el.metadata?.linkViewId?.trim();
    if (!viewId) return null;
    const name = opts?.viewNameById?.[viewId]?.trim();
    return name || "Board-Sicht";
  }
  const url = normalizeExternalUrl(el.metadata?.linkUrl);
  if (!url) {
    const raw = el.metadata?.linkUrl?.trim();
    return raw || null;
  }
  return shortHttpUrlLabel(url);
}

/** Compact host + path for an absolute http(s) URL. */
export function shortHttpUrlLabel(url: string, maxLen = 36): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const hostPath = `${parsed.host}${path}`;
    return hostPath.length > maxLen ? `${hostPath.slice(0, maxLen - 2)}…` : hostPath;
  } catch {
    return url;
  }
}

export type ActivateLinkResult =
  | { ok: true; kind: "external"; url: string }
  | { ok: true; kind: "view"; viewId: string; viewName: string }
  | { ok: false; reason: string };

/** Resolve and apply a link sticky (open URL or switch board view). */
export function activateBoardLink(el: StormElement): ActivateLinkResult {
  const kind = el.metadata?.linkKind ?? "external";

  if (kind === "view") {
    const viewId = el.metadata?.linkViewId?.trim();
    if (!viewId) return { ok: false, reason: "Keine Sicht gewählt." };
    const store = useStormBoardStore.getState();
    const view = store.views.find((v) => v.id === viewId);
    if (!view) return { ok: false, reason: "Sicht nicht gefunden (gelöscht?)." };
    if (store.activeViewId !== viewId) {
      store.setActiveView(viewId);
    }
    return { ok: true, kind: "view", viewId, viewName: view.name };
  }

  const url = normalizeExternalUrl(el.metadata?.linkUrl);
  if (!url) return { ok: false, reason: "Keine gültige URL." };
  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true, kind: "external", url };
}
