import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

type Status = "connecting" | "connected" | "disconnected";

export interface SupabaseYjsProviderOptions {
  supabase: SupabaseClient;
  roomCode: string;
  doc: Y.Doc;
  awareness: Awareness;
  onStatus?: (status: Status) => void;
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

    this.docUpdateHandler = (update, origin) => {
      if (origin === this || this.destroyed) return;
      this.broadcast("update", update);
    };
    this.doc.on("update", this.docUpdateHandler);

    this.awarenessHandler = ({ added, updated, removed }, origin) => {
      if (origin === this || this.destroyed) return;
      const changed = added.concat(updated, removed);
      if (changed.length === 0) return;
      const update = encodeAwarenessUpdate(this.awareness, changed);
      this.broadcast("awareness", update);
    };
    this.awareness.on("update", this.awarenessHandler);
  }

  async connect(): Promise<void> {
    this.onStatus?.("connecting");
    const channelName = `room:${this.roomCode}`;
    this.channel = this.supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on("broadcast", { event: "sync-step1" }, ({ payload }) => {
        const stateVector = Uint8Array.from(payload?.bytes ?? []);
        const update = Y.encodeStateAsUpdate(this.doc, stateVector);
        this.broadcast("sync-step2", update);
        this.broadcastAwarenessFull();
      })
      .on("broadcast", { event: "sync-step2" }, ({ payload }) => {
        const update = Uint8Array.from(payload?.bytes ?? []);
        if (update.byteLength) Y.applyUpdate(this.doc, update, this);
      })
      .on("broadcast", { event: "update" }, ({ payload }) => {
        const update = Uint8Array.from(payload?.bytes ?? []);
        if (update.byteLength) Y.applyUpdate(this.doc, update, this);
      })
      .on("broadcast", { event: "awareness" }, ({ payload }) => {
        const update = Uint8Array.from(payload?.bytes ?? []);
        if (update.byteLength) applyAwarenessUpdate(this.awareness, update, this);
      });

    await new Promise<void>((resolve, reject) => {
      this.channel!
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            this.onStatus?.("connected");
            // Ask peers for their state
            const sv = Y.encodeStateVector(this.doc);
            this.broadcast("sync-step1", sv);
            this.broadcastAwarenessFull();
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            this.onStatus?.("disconnected");
            reject(new Error(`Realtime: ${status}`));
          } else if (status === "CLOSED") {
            this.onStatus?.("disconnected");
          }
        });
    });
  }

  private broadcast(event: string, bytes: Uint8Array): void {
    if (!this.channel || this.destroyed) return;
    void this.channel.send({
      type: "broadcast",
      event,
      payload: { bytes: Array.from(bytes) },
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

/** Encode/decode helpers kept for tests / future binary framing. */
export function encodeBytesMessage(bytes: Uint8Array): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint8Array(enc, bytes);
  return encoding.toUint8Array(enc);
}

export function decodeBytesMessage(data: Uint8Array): Uint8Array {
  const dec = decoding.createDecoder(data);
  return decoding.readVarUint8Array(dec);
}
