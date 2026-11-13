import { getOrCreateTabSessionId } from "@/lib/working-file-tab-context";

const DRAFT_KEY_PREFIX = "e2.board.session-draft:";

function draftStorageKey(): string {
  return `${DRAFT_KEY_PREFIX}${getOrCreateTabSessionId()}`;
}

/** Persist in-session board JSON for tabs without an Arbeitsdatei (survives reload). */
export function saveBoardSessionDraft(json: string): void {
  if (typeof sessionStorage === "undefined") return;
  const trimmed = json.trim();
  if (!trimmed) {
    clearBoardSessionDraft();
    return;
  }
  try {
    sessionStorage.setItem(draftStorageKey(), trimmed);
  } catch {
    /* quota / private mode */
  }
}

export function readBoardSessionDraft(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(draftStorageKey())?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function clearBoardSessionDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(draftStorageKey());
  } catch {
    /* ignore */
  }
}
