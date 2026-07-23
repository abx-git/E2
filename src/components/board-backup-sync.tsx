"use client";

import { useEffect, useRef } from "react";

import {
  type BackupIntervalMinutes,
  createBoardBackupNow,
  formatLastBackupLabel,
  readLastBackupAt,
} from "@/lib/board-backup";

export interface BoardBackupSyncProps {
  intervalMinutes: BackupIntervalMinutes;
  onLastBackupChange: (label: string) => void;
}

/** Runs timed backups while `intervalMinutes > 0`. */
export function BoardBackupSync({ intervalMinutes, onLastBackupChange }: BoardBackupSyncProps) {
  const onChangeRef = useRef(onLastBackupChange);
  onChangeRef.current = onLastBackupChange;

  useEffect(() => {
    onChangeRef.current(formatLastBackupLabel(readLastBackupAt()));
  }, []);

  useEffect(() => {
    if (intervalMinutes <= 0) return;
    const ms = intervalMinutes * 60_000;
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const result = createBoardBackupNow();
      if (!result.skipped) {
        onChangeRef.current(formatLastBackupLabel(readLastBackupAt()));
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [intervalMinutes]);

  return null;
}

export function runManualBoardBackup(onDone?: (label: string) => void): void {
  const result = createBoardBackupNow({ allowEmpty: true });
  if (result.skipped) {
    window.alert("Kein Board-Inhalt zum Sichern.");
    return;
  }
  onDone?.(formatLastBackupLabel(readLastBackupAt()));
}
