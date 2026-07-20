"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Loader2, Users, X } from "lucide-react";

import { isCollabConfigured } from "@/lib/collab/config";
import { getCollabShareUrl, useCollabStore } from "@/lib/collab/session";

export interface CollabRoomDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CollabRoomDialog({ open, onClose }: CollabRoomDialogProps) {
  const configured = isCollabConfigured();
  const active = useCollabStore((s) => s.active);
  const room = useCollabStore((s) => s.room);
  const connecting = useCollabStore((s) => s.connecting);
  const error = useCollabStore((s) => s.error);
  const displayName = useCollabStore((s) => s.displayName);
  const setDisplayName = useCollabStore((s) => s.setDisplayName);
  const createRoom = useCollabStore((s) => s.createRoom);
  const joinRoom = useCollabStore((s) => s.joinRoom);
  const leaveRoom = useCollabStore((s) => s.leaveRoom);
  const isHost = useCollabStore((s) => s.isHost);

  const [tab, setTab] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [name, setName] = useState(displayName);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(displayName);
      setLocalError(null);
    }
  }, [open, displayName]);

  if (!open) return null;

  const shareUrl = room ? getCollabShareUrl(room.code) : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="dock-surface w-full max-w-md rounded-dock p-4 shadow-dock"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Kollaboration</h2>
            <p className="mt-1 text-[0.72rem] text-[var(--muted)]">
              Geteilter Raum über Supabase Free Tier
            </p>
          </div>
          <button
            type="button"
            className="dock-control rounded-md p-1.5"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!configured ? (
          <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--control)] p-3 text-[0.78rem] text-[var(--muted)]">
            Nicht konfiguriert. Siehe{" "}
            <code className="text-[var(--accent-2)]">docs/COLLABORATION.md</code> und setze{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
        ) : active && room ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--control)] p-3">
              <p className="text-[0.72rem] text-[var(--muted)]">Raum-Code</p>
              <p className="mt-1 font-mono text-lg tracking-widest text-[var(--text)]">{room.code}</p>
              {isHost && (
                <p className="mt-1 text-[0.68rem] text-[var(--accent)]">Du bist Host dieses Raums</p>
              )}
              <p className="mt-2 text-[0.68rem] text-[var(--muted)]">
                Gültig bis {new Date(room.expiresAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="dock-control flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Kopiert" : "Link kopieren"}
              </button>
              <button
                type="button"
                className="dock-control rounded-lg px-3 py-2 text-sm text-red-300"
                onClick={() => {
                  leaveRoom();
                  onClose();
                }}
              >
                Verlassen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-1 rounded-lg bg-[var(--control)] p-1">
              <button
                type="button"
                className={[
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium",
                  tab === "create" ? "bg-[var(--control-hover)] text-[var(--text)]" : "text-[var(--muted)]",
                ].join(" ")}
                onClick={() => setTab("create")}
              >
                Raum erstellen
              </button>
              <button
                type="button"
                className={[
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium",
                  tab === "join" ? "bg-[var(--control-hover)] text-[var(--text)]" : "text-[var(--muted)]",
                ].join(" ")}
                onClick={() => setTab("join")}
              >
                Beitreten
              </button>
            </div>

            <label className="mt-3 block text-[0.72rem] text-[var(--muted)]">
              Anzeigename
              <input
                className="dock-field mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Name"
                maxLength={40}
              />
            </label>

            {tab === "join" && (
              <label className="mt-3 block text-[0.72rem] text-[var(--muted)]">
                Raum-Code
                <input
                  className="dock-field mt-1 font-mono uppercase tracking-wider"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={8}
                />
              </label>
            )}

            {(localError || error) && (
              <p className="mt-3 text-[0.72rem] text-[var(--accent-2)]">{localError || error}</p>
            )}

            <button
              type="button"
              disabled={connecting || !name.trim() || (tab === "join" && code.trim().length < 4)}
              className="dock-control-active mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => {
                void (async () => {
                  setLocalError(null);
                  setDisplayName(name);
                  if (tab === "create") {
                    const r = await createRoom();
                    if (!r.ok) setLocalError(r.error);
                  } else {
                    const r = await joinRoom(code, name);
                    if (!r.ok) setLocalError(r.error);
                  }
                })();
              }}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {tab === "create" ? "Raum starten" : "Beitreten"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
