import * as Y from "yjs";

import type { BoardImportPayload, BoardSnapshotV1 } from "@/lib/storm-json";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION_V1,
  migrateV1ToDocument,
  normalizeBoardDocument,
} from "@/lib/storm-json";

const PAYLOAD_KEY = "payloadJson";
const LEGACY_PAYLOAD_KEY = "payload";

/** Yjs doc: board payload as JSON string (reliable LWW sync over Broadcast). */
export function createBoardYDoc(): Y.Doc {
  return new Y.Doc();
}

export function applyPayloadToYDoc(doc: Y.Doc, payload: BoardImportPayload, origin?: unknown): void {
  const root = doc.getMap<string>("board");
  const normalized = normalizeBoardDocument(payload);
  const json = JSON.stringify(normalized);
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
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return coerceObjectPayload(parsed);
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
      return coerceObjectPayload(plain as Record<string, unknown>);
    } catch {
      return null;
    }
  }
  return null;
}

function coerceObjectPayload(obj: Record<string, unknown>): BoardImportPayload | null {
  if (Array.isArray(obj.views)) {
    return normalizeBoardDocument(obj as Partial<BoardImportPayload>);
  }
  // Flat v1-shaped payload (collab sessions before multi-view)
  if (Array.isArray(obj.elements) || typeof obj.title === "string") {
    const fakeV1 = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION_V1,
      exportedAt: new Date().toISOString(),
      title: typeof obj.title === "string" ? obj.title : "Board",
      workshopFormat: (obj.workshopFormat as BoardSnapshotV1["workshopFormat"]) ?? "free",
      facilitatorEnabled: Boolean(obj.facilitatorEnabled),
      facilitatorPhase: Number(obj.facilitatorPhase) || 0,
      elements: Array.isArray(obj.elements) ? obj.elements : [],
      relations: Array.isArray(obj.relations) ? obj.relations : [],
      contextRelations: Array.isArray(obj.contextRelations) ? obj.contextRelations : [],
      swimlanes: Array.isArray(obj.swimlanes) ? obj.swimlanes : [],
      boundedContexts: Array.isArray(obj.boundedContexts) ? obj.boundedContexts : [],
      timeline: obj.timeline,
      viewport: obj.viewport,
      glossary: Array.isArray(obj.glossary) ? obj.glossary : [],
      appearance: obj.appearance,
      modelingMode: obj.modelingMode,
      snapToTimeline: obj.snapToTimeline,
      snapToGrid: obj.snapToGrid,
    } as BoardSnapshotV1;
    return migrateV1ToDocument(fakeV1);
  }
  return null;
}

export function readPayloadFromYDoc(doc: Y.Doc): BoardImportPayload | null {
  const root = doc.getMap("board");
  return coerceRawPayload(root.get(PAYLOAD_KEY)) ?? coerceRawPayload(root.get(LEGACY_PAYLOAD_KEY));
}

export function encodeYDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function applyYDocState(doc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(doc, update, origin);
}

export const LOCAL_ORIGIN = "local";
export const REMOTE_ORIGIN = "remote";
