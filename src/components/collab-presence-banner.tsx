"use client";

import { EyeOff, Wifi, WifiOff } from "lucide-react";

import { useT } from "@/i18n";
import { useCollabStore } from "@/lib/collab/session";
import {
  getWorkingFileLabel,
  getCollabGuestLocalPersistMode,
  isCollabGuestLocalPersistEnabled,
  isWorkingFileAttached,
  isWorkingFileDirty,
} from "@/lib/working-file";

export interface CollabPresenceBannerProps {
  onRequestLeave: () => void;
}

/** Live presence strip when a collab room is active. */
export function CollabPresenceBanner({ onRequestLeave }: CollabPresenceBannerProps) {
  const t = useT();
  const active = useCollabStore((s) => s.active);
  const status = useCollabStore((s) => s.status);
  const room = useCollabStore((s) => s.room);
  const peers = useCollabStore((s) => s.peers);
  const isHost = useCollabStore((s) => s.isHost);
  const error = useCollabStore((s) => s.error);
  const tabWriterRole = useCollabStore((s) => s.tabWriterRole);
  const syncConflict = useCollabStore((s) => s.syncConflict);
  const fileAttached = isWorkingFileAttached();
  const fileDirty = fileAttached && isWorkingFileDirty();
  const guestLocalPersist = isCollabGuestLocalPersistEnabled();
  const guestPersistMode = getCollabGuestLocalPersistMode();
  const localFileLabel = getWorkingFileLabel();

  if (!active || !room) return null;

  const disconnected = status === "disconnected" || status === "error";
  const isFollower = tabWriterRole === "follower";
  const hasConflict = syncConflict !== null;

  const statusLabel = hasConflict
    ? t("collab.syncConflict")
    : isFollower
      ? t("collab.passiveTab")
      : disconnected
        ? t("collab.broadcastDisconnected")
        : t("collab.live");

  return (
    <div
      className={[
        "mx-3 mt-2 flex flex-wrap items-center gap-2 rounded-dock px-3 py-1.5 text-xs",
        hasConflict || isFollower
          ? "border border-[var(--accent-2)] bg-[rgba(233,196,106,0.14)] text-[var(--text)]"
          : disconnected
            ? "border border-[var(--accent-2)] bg-[rgba(233,196,106,0.12)] text-[var(--accent-2)]"
            : "dock-surface text-[var(--text)]",
      ].join(" ")}
    >
      {isFollower ? (
        <EyeOff className="h-3.5 w-3.5 shrink-0 text-[var(--accent-2)]" />
      ) : disconnected ? (
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Wifi className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
      )}
      <span className="font-medium">
        {statusLabel}
        {" · "}
        {room.code}
        {isHost ? ` · ${t("collab.host")}` : ""}
      </span>
      {hasConflict && (
        <span className="text-[var(--accent-2)]">{t("panels.collabPresenceConflict")}</span>
      )}
      {isFollower && !hasConflict && (
        <span className="text-[var(--accent-2)]" title={t("collab.notWritingTitle")}>
          {t("panels.collabNotWriting")}
        </span>
      )}
      {disconnected && !isFollower && !hasConflict && (
        <span className="text-[var(--muted)]" title={t("panels.collabSnapshotSync")}>
          {t("collab.snapshotActive")}
        </span>
      )}
      <span className="text-[var(--muted)]">{t("collab.online", { n: peers.length })}</span>
      {fileAttached && guestLocalPersist && (
        <span
          className={fileDirty ? "text-[var(--accent-2)]" : "text-[var(--accent)]"}
          title={t("collab.guestLocalMirrorTitle", { file: localFileLabel ?? "" })}
        >
          {fileDirty ? t("collab.guestLocalSaving") : t("collab.guestLocalSaved")}
          {guestPersistMode === "disk" ? ` · ${t("collab.guestLocalDisk")}` : null}
        </span>
      )}
      {!isHost && !guestLocalPersist && (
        <span className="text-[var(--muted)]" title={t("collab.onlineOnlyTitle")}>
          {t("collab.onlineOnly")}
        </span>
      )}
      {fileAttached && isHost && !guestLocalPersist && (
        <span
          className="text-[var(--muted)]"
          title={t("panels.collabNoMirror")}
        >
          {t("collab.fileNotMirrored")}
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
        {t("collab.leave")}
      </button>
    </div>
  );
}
