/** postMessage types for iframe embed (see `docs/EMBED.md`, `docs/EMBED-HOST.md`). */
export const EMBED_HOST_PROTOCOL_VERSION = 1;

export const EMBED_LOAD_MESSAGE = "e2/embed-load";
export const EMBED_READY_MESSAGE = "e2/embed-ready";
export const EMBED_DOCUMENT_MESSAGE = "e2/embed-document";
export const EMBED_REQUEST_SAVE_MESSAGE = "e2/embed-request-save";
export const EMBED_SAVE_ACK_MESSAGE = "e2/embed-save-ack";
export const EMBED_DIRTY_MESSAGE = "e2/embed-dirty";

export type EmbedDocumentReason = "autosave" | "flush";

export type EmbedLoadMessage = {
  type: typeof EMBED_LOAD_MESSAGE;
  json: string;
  hostFileId?: string;
  editable?: boolean;
  autosave?: boolean;
};

export type EmbedReadyMessage = {
  type: typeof EMBED_READY_MESSAGE;
  hostProtocol: typeof EMBED_HOST_PROTOCOL_VERSION;
};

export type EmbedDocumentMessage = {
  type: typeof EMBED_DOCUMENT_MESSAGE;
  json: string;
  hostFileId: string;
  revision: number;
  reason: EmbedDocumentReason;
};

export type EmbedRequestSaveMessage = {
  type: typeof EMBED_REQUEST_SAVE_MESSAGE;
  hostFileId?: string;
};

export type EmbedSaveAckMessage = {
  type: typeof EMBED_SAVE_ACK_MESSAGE;
  hostFileId: string;
  ok: boolean;
  error?: string;
};

export type EmbedDirtyMessage = {
  type: typeof EMBED_DIRTY_MESSAGE;
  hostFileId: string;
  dirty: boolean;
};

export function isEmbedLoadMessage(data: unknown): data is EmbedLoadMessage {
  if (!data || typeof data !== "object") return false;
  const d = data as EmbedLoadMessage;
  return d.type === EMBED_LOAD_MESSAGE && typeof d.json === "string";
}

export function isEmbedRequestSaveMessage(data: unknown): data is EmbedRequestSaveMessage {
  if (!data || typeof data !== "object") return false;
  return (data as EmbedRequestSaveMessage).type === EMBED_REQUEST_SAVE_MESSAGE;
}

export function isEmbedSaveAckMessage(data: unknown): data is EmbedSaveAckMessage {
  if (!data || typeof data !== "object") return false;
  const d = data as EmbedSaveAckMessage;
  return d.type === EMBED_SAVE_ACK_MESSAGE && typeof d.hostFileId === "string";
}