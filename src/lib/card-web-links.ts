import { normalizeExternalUrl, shortHttpUrlLabel } from "@/lib/board-link";
import type { CardWebLink, StormElement } from "@/types/storm-element";

/** Keep only links with a non-empty URL; accept `{ url, title? }` or plain strings. */
export function normalizeCardWebLinks(raw: unknown): CardWebLink[] {
  if (!Array.isArray(raw)) return [];
  const out: CardWebLink[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    let url = "";
    let title = "";
    if (typeof item === "string") {
      url = item.trim();
    } else if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      url = typeof rec.url === "string" ? rec.url.trim() : "";
      title = typeof rec.title === "string" ? rec.title.trim() : "";
    }
    if (!url) continue;
    const key = `${title}\0${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title ? { url, title } : { url });
  }
  return out;
}

export function elementWebLinks(el: Pick<StormElement, "metadata">): CardWebLink[] {
  return normalizeCardWebLinks(el.metadata?.webLinks);
}

export function cardWebLinkHref(link: CardWebLink): string | null {
  return normalizeExternalUrl(link.url);
}

export function cardWebLinkLabel(link: CardWebLink): string {
  const title = link.title?.trim();
  if (title) return title;
  const href = cardWebLinkHref(link);
  if (href) return shortHttpUrlLabel(href);
  return link.url.trim() || "Link";
}

export function cardWebLinkLines(el: Pick<StormElement, "metadata">): string[] {
  return elementWebLinks(el).map(cardWebLinkLabel);
}
