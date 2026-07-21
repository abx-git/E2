"use client";

import { Wifi, WifiOff } from "lucide-react";

import { useCollabStore } from "@/lib/collab/session";
import { isWorkingFileAttached, isWorkingFilePersistPaused } from "@/lib/working-file";

export interface CollabPresenceBannerProps {
  onRequestLeave: () => void;
}

/** Live presence strip when a collab room is active. */
export function CollabPresenceBanner({ onRequestLeave }: CollabPresenceBannerProps) {
  const active = useCollabStore((s) => s.active);
  const status = useCollabStore((s) => s.status);
  const room = useCollabStore((s) => s.room);
  const peers = useCollabStore((s) => s.peers);
  const isHost = useCollabStore((s) => s.isHost);
  const error = useCollabStore((s) => s.error);

  if (!active || !room) return null;

  const disconnected = status === "disconnected" || status === "error";
  const filePaused = isWorkingFileAttached() && isWorkingFilePersistPaused();

  return (
    <div
      className={[
        "mx-3 mt-2 flex flex-wrap items-center gap-2 rounded-dock px-3 py-1.5 text-xs",
        disconnected
          ? "border border-[var(--accent-2)] bg-[rgba(233,196,106,0.12)] text-[var(--accent-2)]"
          : "dock-surface text-[var(--text)]",
      ].join(" ")}
    >
      {disconnected ? (
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Wifi className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
      )}
      <span className="font-medium">
        {disconnected ? "Verbindung getrennt" : "Live"}
        {" · "}
        {room.code}
        {isHost ? " · Host" : ""}
      </span>
      <span className="text-[var(--muted)]">{peers.length} online</span>
      {filePaused && (
        <span className="text-[var(--accent-2)]" title="Arbeitsdatei wird während Collab nicht überschrieben">
          Datei pausiert
        </span>
      )}
      <div className="flex -space-x-1">
        {peers.slice(0, 8).map((p) => (
          <span
            key={p.clientId}
            title={p.name}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-bold text-[#0f1419]"
            style={{ backgroundColor: p.color }}
          >
            {p.name.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      {error && <span className="text-[var(--accent-2)]">{error}</span>}
      <button
        type="button"
        className="ml-auto rounded px-2 py-0.5 text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)]"
        onClick={onRequestLeave}
      >
        Verlassen
      </button>
    </div>
  );
}
