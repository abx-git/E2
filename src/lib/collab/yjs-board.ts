import * as Y from "yjs";

import type { BoardImportPayload } from "@/lib/storm-json";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";

const PAYLOAD_KEY = "payload";

/** Yjs doc holding the shared board as a single JSON payload map entry (CRDT-merged via last writer per key updates). */
export function createBoardYDoc(): Y.Doc {
  return new Y.Doc();
}

export function applyPayloadToYDoc(doc: Y.Doc, payload: BoardImportPayload, origin?: unknown): void {
  const root = doc.getMap("board");
  doc.transact(() => {
    root.set(PAYLOAD_KEY, structuredClone(payload));
  }, origin);
}

export function readPayloadFromYDoc(doc: Y.Doc): BoardImportPayload | null {
  const root = doc.getMap("board");
  const raw = root.get(PAYLOAD_KEY);
  if (!raw || typeof raw !== "object") return null;
  return normalizePayload(raw as BoardImportPayload);
}

function normalizePayload(p: Partial<BoardImportPayload>): BoardImportPayload {
  return {
    title: p.title ?? "Board",
    workshopFormat: p.workshopFormat ?? "free",
    facilitatorEnabled: Boolean(p.facilitatorEnabled),
    facilitatorPhase: Number(p.facilitatorPhase) || 0,
    elements: Array.isArray(p.elements) ? p.elements : [],
    relations: Array.isArray(p.relations) ? p.relations : [],
    contextRelations: Array.isArray(p.contextRelations) ? p.contextRelations : [],
    swimlanes: Array.isArray(p.swimlanes) ? p.swimlanes : [],
    boundedContexts: Array.isArray(p.boundedContexts) ? p.boundedContexts : [],
    timeline: p.timeline ? { ...DEFAULT_TIMELINE, ...p.timeline } : { ...DEFAULT_TIMELINE },
    viewport: p.viewport ? { ...DEFAULT_VIEWPORT, ...p.viewport } : { ...DEFAULT_VIEWPORT },
    glossary: Array.isArray(p.glossary) ? p.glossary : [],
    appearance: p.appearance ? { ...DEFAULT_APPEARANCE, ...p.appearance } : { ...DEFAULT_APPEARANCE },
    snapToTimeline: p.snapToTimeline ?? true,
    snapToGrid: p.snapToGrid ?? false,
  };
}

export function encodeYDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function applyYDocState(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}

export const LOCAL_ORIGIN = "local";
export const REMOTE_ORIGIN = "remote";
