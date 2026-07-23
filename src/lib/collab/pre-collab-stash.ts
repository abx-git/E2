/**
 * In-memory snapshot of the board taken right before entering a collab room,
 * so leave can optionally restore the pre-room local stand.
 */

import { applyBoardJsonToStore, boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import { getWorkingFileLabel } from "@/lib/working-file";

export interface PreCollabStash {
  json: string;
  savedAt: number;
  fileLabel: string | null;
}

let stash: PreCollabStash | null = null;

/** Capture current editor board before join/create replaces it. */
export function capturePreCollabStash(): void {
  stash = {
    json: boardJsonFromStoreState(),
    savedAt: Date.now(),
    fileLabel: getWorkingFileLabel(),
  };
}

export function hasPreCollabStash(): boolean {
  return Boolean(stash?.json.trim());
}

export function getPreCollabStash(): PreCollabStash | null {
  return stash;
}

export function clearPreCollabStash(): void {
  stash = null;
}

/** Apply stashed JSON into the Zustand store. Returns false if empty/invalid. */
export function applyPreCollabStashToStore(): boolean {
  if (!stash?.json.trim()) return false;
  return applyBoardJsonToStore(stash.json);
}
