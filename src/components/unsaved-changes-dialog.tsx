"use client";

import { useId } from "react";
import { createPortal } from "react-dom";

export type UnsavedChangesChoice = "save" | "discard" | "cancel";

export interface UnsavedChangesDialogProps {
  open: boolean;
  /** What the user is about to do, e.g. „Öffnen“, „Neu“, „Schließen“. */
  actionLabel: string;
  fileName?: string | null;
  busy?: boolean;
  /** When false, hide Speichern (e.g. no FS access and no attached file — only Speichern unter via parent). */
  canSave?: boolean;
  saveLabel?: string;
  onChoose: (choice: UnsavedChangesChoice) => void;
}

/**
 * Classic document prompt: Speichern / Nicht speichern / Abbrechen
 * (Windows / macOS style before New, Open, Close).
 */
export function UnsavedChangesDialog({
  open,
  actionLabel,
  fileName,
  busy,
  canSave = true,
  saveLabel = "Speichern",
  onChoose,
}: UnsavedChangesDialogProps) {
  const titleId = useId();
  if (!open) return null;

  const label = fileName?.trim() ? `„${fileName.trim()}“` : "dieses Board";

  const layer = (
    <div
      className="fixed inset-0 z-[1450] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          Änderungen speichern?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {label} wurde geändert. Möchtest du speichern, bevor du „{actionLabel}“ ausführst?
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("cancel")}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("discard")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Nicht speichern
          </button>
          {canSave ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("save")}
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
            >
              {saveLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
