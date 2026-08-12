"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export interface RemoteBoardLoadDialogProps {
  open: boolean;
  sourceUrl: string;
  busy?: boolean;
  boardHasContent: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoteBoardLoadDialog({
  open,
  sourceUrl,
  busy,
  boardHasContent,
  error,
  onCancel,
  onConfirm,
}: RemoteBoardLoadDialogProps) {
  const titleId = useId();
  if (!open) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[1350] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
          Remote-Board laden?
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <p>
            Es wird eine <strong className="font-semibold text-slate-800">.storm.json</strong> von
            dieser URL geladen und in den Editor übernommen:
          </p>
          <p className="break-all rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-mono text-[0.7rem] text-slate-700">
            {sourceUrl}
          </p>
          {boardHasContent ? (
            <p>
              Der aktuelle Editor-Inhalt wird ersetzt. Danach kannst du lokal weiterarbeiten
              („Speichern unter…“).
            </p>
          ) : (
            <p>Danach kannst du lokal weiterarbeiten („Speichern unter…“).</p>
          )}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Laden
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
