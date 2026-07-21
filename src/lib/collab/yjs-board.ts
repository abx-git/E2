import * as Y from "yjs";

import type { BoardImportPayload } from "@/lib/storm-json";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";

const PAYLOAD_KEY = "payloadJson";
const LEGACY_PAYLOAD_KEY = "payload";

/** Yjs doc: board payload as JSON string (reliable LWW sync over Broadcast). */
export function createBoardYDoc(): Y.Doc {
  return new Y.Doc();
}

export function applyPayloadToYDoc(doc: Y.Doc, payload: BoardImportPayload, origin?: unknown): void {
  const root = doc.getMap<string>("board");
  const json = JSON.stringify(payload);
  // Skip no-op writes to avoid echo loops.
  if (root.get(PAYLOAD_KEY) === json && !root.has(LEGACY_PAYLOAD_KEY)) return;
  doc.transact(() => {
    root.set(PAYLOAD_KEY, json);
    if (root.has(LEGACY_PAYLOAD_KEY)) root.delete(LEGACY_PAYLOAD_KEY);
  }, origin);
}

function coerceRawPayload(raw: unknown): BoardImportPayload | null {
  if (typeof raw === "string" && raw.trim()) {
    try {
      return normalizePayload(JSON.parse(raw) as Partial<BoardImportPayload>);
    } catch {
      return null;
    }
  }
  // Legacy: nested Y types from older sessions
  if (raw && typeof raw === "object") {
    try {
      const plain =
        typeof (raw as { toJSON?: () => unknown }).toJSON === "function"
          ? (raw as { toJSON: () => unknown }).toJSON()
          : raw;
      return normalizePayload(plain as Partial<BoardImportPayload>);
    } catch {
      return null;
    }
  }
  return null;
}

export function readPayloadFromYDoc(doc: Y.Doc): BoardImportPayload | null {
  const root = doc.getMap("board");
  return coerceRawPayload(root.get(PAYLOAD_KEY)) ?? coerceRawPayload(root.get(LEGACY_PAYLOAD_KEY));
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

export function applyYDocState(doc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(doc, update, origin);
}

export const LOCAL_ORIGIN = "local";
export const REMOTE_ORIGIN = "remote";
