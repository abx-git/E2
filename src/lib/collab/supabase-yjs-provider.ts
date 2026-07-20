import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";

type Status = "connecting" | "connected" | "disconnected";

export interface SupabaseYjsProviderOptions {
  supabase: SupabaseClient;
  roomCode: string;
  doc: Y.Doc;
  awareness: Awareness;
  onStatus?: (status: Status) => void;
  onError?: (message: string) => void;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function payloadToBytes(payload: { b64?: string; bytes?: number[] } | null | undefined): Uint8Array {
  if (!payload) return new Uint8Array();
  if (typeof payload.b64 === "string" && payload.b64) return base64ToBytes(payload.b64);
  if (Array.isArray(payload.bytes)) return Uint8Array.from(payload.bytes);
  return new Uint8Array();
}

/**
 * Syncs a Y.Doc over Supabase Realtime Broadcast.
 * Message types: sync-step1, sync-step2, update, awareness.
 */
export class SupabaseYjsProvider {
  readonly awareness: Awareness;
  private channel: RealtimeChannel | null = null;
  private readonly doc: Y.Doc;
  private readonly supabase: SupabaseClient;
  private readonly roomCode: string;
  private readonly onStatus?: (status: Status) => void;
  private readonly onError?: (message: string) => void;
  private destroyed = false;
  private readonly docUpdateHandler: (update: Uint8Array, origin: unknown) => void;
  private readonly awarenessHandler: (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => void;

  constructor(opts: SupabaseYjsProviderOptions) {
    this.supabase = opts.supabase;
    this.roomCode = opts.roomCode;
    this.doc = opts.doc;
    this.awareness = opts.awareness;
    this.onStatus = opts.onStatus;
    this.onError = opts.onError;

    this.docUpdateHandler = (update, origin) => {
      if (origin === this || this.destroyed) return;
      this.broadcast("update", update);
    };
    this.doc.on("update", this.docUpdateHandler);

    this.awarenessHandler = ({ added, updated, removed }, origin) => {
      if (origin === this || this.destroyed) return;
      const changed = added.concat(updated, removed);
      if (changed.length === 0) return;
      const encoded = encodeAwarenessUpdate(this.awareness, changed);
      this.broadcast("awareness", encoded);
    };
    this.awareness.on("update", this.awarenessHandler);
  }

  async connect(): Promise<void> {
    this.onStatus?.("connecting");
    const channelName = `board-room:${this.roomCode}`;
    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: String(this.doc.clientID) },
      },
    });

    this.channel
      .on("broadcast", { event: "sync-step1" }, ({ payload }) => {
        const stateVector = payloadToBytes(payload);
        const update = Y.encodeStateAsUpdate(this.doc, stateVector);
        this.broadcast("sync-step2", update);
        this.broadcastAwarenessFull();
      })
      .on("broadcast", { event: "sync-step2" }, ({ payload }) => {
        const update = payloadToBytes(payload);
        if (update.byteLength) Y.applyUpdate(this.doc, update, this);
      })
      .on("broadcast", { event: "update" }, ({ payload }) => {
        const update = payloadToBytes(payload);
        if (update.byteLength) Y.applyUpdate(this.doc, update, this);
      })
      .on("broadcast", { event: "awareness" }, ({ payload }) => {
        const update = payloadToBytes(payload);
        if (update.byteLength) applyAwarenessUpdate(this.awareness, update, this);
      });

    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          this.onStatus?.("connected");
          const sv = Y.encodeStateVector(this.doc);
          this.broadcast("sync-step1", sv);
          this.broadcastAwarenessFull();
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.onStatus?.("disconnected");
          const msg = err?.message ?? `Realtime: ${status}`;
          this.onError?.(msg);
          reject(new Error(msg));
        } else if (status === "CLOSED") {
          this.onStatus?.("disconnected");
        }
      });
    });
  }

  private broadcast(event: string, bytes: Uint8Array): void {
    if (!this.channel || this.destroyed) return;
    void this.channel
      .send({
        type: "broadcast",
        event,
        payload: { b64: bytesToBase64(bytes) },
      })
      .then((result) => {
        if (result !== "ok") {
          this.onError?.(`Broadcast fehlgeschlagen: ${String(result)}`);
        }
      })
      .catch((e: unknown) => {
        this.onError?.(e instanceof Error ? e.message : "Broadcast-Fehler");
      });
  }

  private broadcastAwarenessFull(): void {
    const ids = Array.from(this.awareness.getStates().keys());
    if (ids.length === 0) return;
    const update = encodeAwarenessUpdate(this.awareness, ids);
    this.broadcast("awareness", update);
  }

  destroy(): void {
    this.destroyed = true;
    this.doc.off("update", this.docUpdateHandler);
    this.awareness.off("update", this.awarenessHandler);
    removeAwarenessStates(this.awareness, [this.doc.clientID], this);
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.onStatus?.("disconnected");
  }
}
