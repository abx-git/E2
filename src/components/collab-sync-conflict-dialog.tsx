"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";

import { useT } from "@/i18n";

export type CollabSyncConflictChoice = "take_remote" | "push_local" | "cancel";

export interface CollabSyncConflictDialogProps {
  open: boolean;
  busy?: boolean;
  onExportJson?: () => void;
  onChoose: (choice: CollabSyncConflictChoice) => void;
}

/**
 * Shown when local edits and a newer server snapshot diverge.
 * Default-safe action is take_remote; push_local requires explicit choice.
 */
export function CollabSyncConflictDialog({
  open,
  busy,
  onExportJson,
  onChoose,
}: CollabSyncConflictDialogProps) {
  const t = useT();
  const titleId = useId();
  if (!open) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[1400] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-xl border border-amber-200 bg-white p-5 shadow-xl sm:rounded-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          {t("collab.syncConflictTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("collab.syncConflictBody")}</p>
        <div className="mt-5 flex flex-col gap-2">
          {onExportJson && (
            <button
              type="button"
              disabled={busy}
              onClick={onExportJson}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {t("collab.exportJsonSafety")}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("take_remote")}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-left text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
          >
            <span className="block">{t("collab.takeRemote")}</span>
            <span className="mt-0.5 block text-[0.72rem] font-normal text-sky-900/70">
              {t("collab.takeRemoteHint")}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("push_local")}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-left text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
          >
            <span className="block">{t("collab.pushLocal")}</span>
            <span className="mt-0.5 block text-[0.72rem] font-normal text-amber-900/70">
              {t("collab.pushLocalHint")}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("cancel")}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("collab.decideLater")}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
