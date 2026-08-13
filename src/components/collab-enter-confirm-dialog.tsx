"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";

export type CollabEnterChoice = "proceed" | "save_and_proceed" | "cancel";

export interface CollabEnterConfirmDialogProps {
  open: boolean;
  mode: "create" | "join";
  workingFileAttached: boolean;
  workingFileDirty: boolean;
  boardHasContent: boolean;
  busy?: boolean;
  onExportJson: () => void;
  onChoose: (choice: CollabEnterChoice) => void;
}

export function CollabEnterConfirmDialog({
  open,
  mode,
  workingFileAttached,
  workingFileDirty,
  boardHasContent,
  busy,
  onExportJson,
  onChoose,
}: CollabEnterConfirmDialogProps) {
  const titleId = useId();
  if (!open) return null;

  const isJoin = mode === "join";
  const showSaveAndProceed = workingFileAttached && workingFileDirty;
  // Create requires a sync target + clean board; dirty → only via Speichern first.
  const showProceed =
    isJoin || (workingFileAttached && !workingFileDirty);

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
          {isJoin ? "Raum beitreten?" : "Raum erstellen?"}
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          {isJoin && boardHasContent && (
            <p>
              Der Editor wird durch den <strong className="font-semibold text-slate-800">Raum-Stand</strong>{" "}
              ersetzt. Alle Teilnehmer arbeiten danach live am selben Board — ohne weitere Nachfragen.
            </p>
          )}
          {!isJoin && boardHasContent && (
            <p>Dein aktuelles Board wird als Startinhalt in den neuen Raum übernommen.</p>
          )}
          {workingFileAttached ? (
            <p>
              Deine verknüpfte Datei bleibt erhalten und wird während des Raums{" "}
              <strong className="font-semibold text-slate-800">nicht überschrieben</strong>. Neu/Öffnen
              ist im Raum nicht möglich — erst nach dem Verlassen.
            </p>
          ) : (
            !isJoin && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                Zuerst „Speichern unter…“ — der Raum braucht eine Datei als lokales Backup.
              </p>
            )
          )}
          <p className="text-slate-500">Optional: JSON exportieren als zusätzliche Kopie.</p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onExportJson}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            JSON exportieren
          </button>
          {showSaveAndProceed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("save_and_proceed")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:opacity-60"
            >
              {isJoin ? "Speichern & Raum laden" : "Speichern & Raum starten"}
            </button>
          )}
          {showProceed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("proceed")}
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
            >
              {isJoin ? "Raum laden" : "Raum starten"}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("cancel")}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
