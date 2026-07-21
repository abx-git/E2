"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";

export type CollabLeaveChoice = "continue" | "save_file" | "reload_file";

export interface CollabLeaveDialogProps {
  open: boolean;
  workingFileAttached: boolean;
  workingFileLabel: string | null;
  busy?: boolean;
  onChoose: (choice: CollabLeaveChoice) => void;
  onCancel: () => void;
}

export function CollabLeaveDialog({
  open,
  workingFileAttached,
  workingFileLabel,
  busy,
  onChoose,
  onCancel,
}: CollabLeaveDialogProps) {
  const titleId = useId();
  const [pending, setPending] = useState<CollabLeaveChoice | null>(null);
  if (!open) return null;

  const fileLabel = workingFileLabel?.trim() ? `„${workingFileLabel.trim()}"` : "Arbeitsdatei";

  const choose = (choice: CollabLeaveChoice) => {
    setPending(choice);
    onChoose(choice);
  };

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
          Raum verlassen
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Die Live-Verbindung endet. Was soll mit dem Board und der lokalen Datei passieren?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("continue")}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-left text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
          >
            <span className="block">Mit aktuellem Board weiter</span>
            <span className="mt-0.5 block text-[0.72rem] font-normal text-sky-900/70">
              Raum-Stand bleibt im Editor
              {workingFileAttached ? "; Datei-Speichern wird wieder aktiv" : ""}
            </span>
          </button>
          {workingFileAttached && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => choose("save_file")}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="block">In {fileLabel} speichern</span>
                <span className="mt-0.5 block text-[0.72rem] font-normal text-slate-500">
                  Aktuellen Board-Stand in die Arbeitsdatei schreiben, dann Solo
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => choose("reload_file")}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="block">{fileLabel} neu laden</span>
                <span className="mt-0.5 block text-[0.72rem] font-normal text-slate-500">
                  Datei-Stand vor / neben dem Raum wiederherstellen
                </span>
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Abbrechen
          </button>
        </div>
        {busy && pending && (
          <p className="mt-3 text-[0.72rem] text-slate-500">Bitte warten…</p>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
