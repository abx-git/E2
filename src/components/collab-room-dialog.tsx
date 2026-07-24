"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Loader2, Settings2, Users, X } from "lucide-react";

import { CollabEnterConfirmDialog } from "@/components/collab-enter-confirm-dialog";
import {
  clearLocalSupabaseConnection,
  getLocalSupabaseConnectionDraft,
  getSupabaseUrl,
  isEnvConfigured,
  saveLocalSupabaseConnection,
} from "@/lib/collab/config";
import { boardHasLocalContent, shouldConfirmCollabEnter } from "@/lib/collab/file-guard";
import { capturePreCollabStash } from "@/lib/collab/pre-collab-stash";
import { getCollabShareUrl, useCollabStore } from "@/lib/collab/session";
import { resetSupabaseClient } from "@/lib/collab/supabase";
import { backupBeforeSuspiciousSwitch } from "@/lib/board-backup";
import { boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import {
  isWorkingFileAttached,
  isWorkingFileDirty,
  persistWorkingFileJson,
} from "@/lib/working-file";

export interface CollabRoomDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefill join tab (e.g. from ?room=). */
  initialJoinCode?: string | null;
  onExportJson: () => void;
  onRequestLeave: () => void;
}

export function CollabRoomDialog({
  open,
  onClose,
  initialJoinCode,
  onExportJson,
  onRequestLeave,
}: CollabRoomDialogProps) {
  const configured = useCollabStore((s) => s.configured);
  const connectionSource = useCollabStore((s) => s.connectionSource);
  const refreshConfigured = useCollabStore((s) => s.refreshConfigured);
  const active = useCollabStore((s) => s.active);
  const room = useCollabStore((s) => s.room);
  const connecting = useCollabStore((s) => s.connecting);
  const error = useCollabStore((s) => s.error);
  const displayName = useCollabStore((s) => s.displayName);
  const setDisplayName = useCollabStore((s) => s.setDisplayName);
  const createRoom = useCollabStore((s) => s.createRoom);
  const joinRoom = useCollabStore((s) => s.joinRoom);
  const isHost = useCollabStore((s) => s.isHost);

  const [tab, setTab] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [name, setName] = useState(displayName);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [enterConfirm, setEnterConfirm] = useState<"create" | "join" | null>(null);
  const envLocked = isEnvConfigured();

  useEffect(() => {
    if (open) {
      setName(displayName);
      setLocalError(null);
      refreshConfigured();
      if (isEnvConfigured()) {
        setSupabaseUrl(getSupabaseUrl() ?? "");
        setSupabaseKey("");
      } else {
        const draft = getLocalSupabaseConnectionDraft();
        setSupabaseUrl(draft.url);
        setSupabaseKey(draft.key);
      }
      setShowConnection(!useCollabStore.getState().configured);
      if (initialJoinCode?.trim()) {
        setTab("join");
        setCode(initialJoinCode.trim().toUpperCase());
      }
    }
  }, [open, displayName, refreshConfigured, initialJoinCode]);

  if (!open) return null;

  const shareUrl = room ? getCollabShareUrl(room.code) : "";
  const sourceLabel =
    connectionSource === "env"
      ? "aus .env / Build"
      : connectionSource === "local"
        ? "lokal im Browser"
        : null;

  const saveConnection = () => {
    setLocalError(null);
    if (envLocked) {
      setLocalError("Verbindung kommt aus der Umgebung (.env) und kann hier nicht überschrieben werden.");
      return;
    }
    const result = saveLocalSupabaseConnection({ url: supabaseUrl, key: supabaseKey });
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    resetSupabaseClient();
    refreshConfigured();
    setShowConnection(false);
  };

  const clearConnection = () => {
    if (envLocked) return;
    clearLocalSupabaseConnection();
    resetSupabaseClient();
    refreshConfigured();
    setSupabaseUrl("");
    setSupabaseKey("");
    setShowConnection(true);
  };

  const runEnter = async (
    mode: "create" | "join",
    options?: { saveFirst?: boolean },
  ) => {
    setLocalError(null);
    setDisplayName(name);
    if (options?.saveFirst && isWorkingFileAttached()) {
      const result = await persistWorkingFileJson(boardJsonFromStoreState());
      if (!result.ok) {
        setLocalError("Speichern in die Arbeitsdatei fehlgeschlagen.");
        return;
      }
    }
    capturePreCollabStash();
    backupBeforeSuspiciousSwitch("room");
    if (mode === "create") {
      const r = await createRoom();
      if (!r.ok) setLocalError(r.error);
    } else {
      const r = await joinRoom(code, name);
      if (!r.ok) setLocalError(r.error);
    }
  };

  const requestEnter = (mode: "create" | "join") => {
    setLocalError(null);
    if (shouldConfirmCollabEnter()) {
      setEnterConfirm(mode);
      return;
    }
    void runEnter(mode);
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="dock-surface max-h-[90vh] w-full max-w-md overflow-y-auto rounded-dock p-4 shadow-dock"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Kollaboration</h2>
                <p className="mt-1 text-[0.72rem] text-[var(--muted)]">
                  Geteilter Raum über Supabase Free Tier
                  {sourceLabel ? ` · Verbindung ${sourceLabel}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {!active && (
                  <button
                    type="button"
                    className="dock-control rounded-md p-1.5"
                    title="Supabase-Verbindung"
                    aria-label="Supabase-Verbindung"
                    onClick={() => setShowConnection((v) => !v)}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="dock-control rounded-md p-1.5"
                  onClick={onClose}
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showConnection && !active && (
              <div className="mt-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--control)] p-3">
                <p className="text-[0.72rem] text-[var(--muted)]">
                  {envLocked
                    ? "Verbindung ist per Build/.env vorgegeben."
                    : "Ohne .env: Project-URL und Publishable/Anon-Key hier speichern (nur in diesem Browser)."}
                </p>
                <label className="block text-[0.72rem] text-[var(--muted)]">
                  Project URL
                  <input
                    className="dock-field mt-1 font-mono text-[0.72rem]"
                    value={supabaseUrl}
                    disabled={envLocked}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-[0.72rem] text-[var(--muted)]">
                  Publishable / Anon Key
                  <input
                    className="dock-field mt-1 font-mono text-[0.72rem]"
                    type={envLocked ? "password" : "text"}
                    value={envLocked ? "••••••••••••••••" : supabaseKey}
                    disabled={envLocked}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="sb_publishable_… oder eyJ…"
                    autoComplete="off"
                  />
                </label>
                {!envLocked && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      className="dock-control-active flex-1 rounded-lg px-3 py-1.5 text-xs"
                      onClick={saveConnection}
                    >
                      Speichern
                    </button>
                    {connectionSource === "local" && (
                      <button
                        type="button"
                        className="dock-control rounded-lg px-3 py-1.5 text-xs text-red-300"
                        onClick={clearConnection}
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!configured && !showConnection ? (
              <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--control)] p-3 text-[0.78rem] text-[var(--muted)]">
                Noch keine Supabase-Verbindung.{" "}
                <button
                  type="button"
                  className="text-[var(--accent)] underline"
                  onClick={() => setShowConnection(true)}
                >
                  Hier eintragen
                </button>{" "}
                oder per <code>.env</code> setzen (siehe docs/COLLABORATION.md).
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
                  {isWorkingFileAttached() && (
                    <p className="mt-2 text-[0.68rem] text-[var(--accent-2)]">
                      Arbeitsdatei-Speichern ist pausiert
                    </p>
                  )}
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
                      onRequestLeave();
                      onClose();
                    }}
                  >
                    Verlassen
                  </button>
                </div>
              </div>
            ) : configured ? (
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
                  onClick={() => requestEnter(tab)}
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  {tab === "create" ? "Raum starten" : "Beitreten"}
                </button>
              </>
            ) : (
              (localError || error) && (
                <p className="mt-3 text-[0.72rem] text-[var(--accent-2)]">{localError || error}</p>
              )
            )}

            {showConnection && (localError || error) && configured === false && (
              <p className="mt-3 text-[0.72rem] text-[var(--accent-2)]">{localError || error}</p>
            )}
          </div>
        </div>,
        document.body,
      )}

      <CollabEnterConfirmDialog
        open={enterConfirm !== null}
        mode={enterConfirm ?? "join"}
        workingFileAttached={isWorkingFileAttached()}
        workingFileDirty={isWorkingFileDirty()}
        boardHasContent={boardHasLocalContent()}
        busy={connecting}
        onExportJson={onExportJson}
        onChoose={(choice) => {
          const mode = enterConfirm;
          setEnterConfirm(null);
          if (choice === "cancel" || !mode) return;
          void runEnter(mode, { saveFirst: choice === "save_and_proceed" });
        }}
      />
    </>
  );
}
