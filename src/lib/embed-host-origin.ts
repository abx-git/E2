/** Allowed parent origins for embed host postMessage (query `parentOrigin`, comma-separated). */
export function readParentOriginsFromSearch(search: string): string[] {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get("parentOrigin");
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isAllowedEmbedHostOrigin(
  messageOrigin: string,
  allowedParentOrigins: string[],
): boolean {
  if (allowedParentOrigins.length === 0) return true;
  return allowedParentOrigins.includes(messageOrigin);
}

export function embedHostModeFromLocation(loc: Pick<Location, "search">): boolean {
  const params = new URLSearchParams(loc.search);
  return params.get("embed") === "1" && typeof globalThis.window !== "undefined";
}

export function isEmbedHostedInParentWindow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}