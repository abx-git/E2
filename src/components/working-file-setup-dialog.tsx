"use client";

import { useId } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/i18n";

export interface WorkingFileSetupDialogProps {
  open: boolean;
  fsAccessSupported: boolean;
  busy?: boolean;
  onStartWithoutFile: () => void;
  onOpenFile: () => void;
  onCreateFile: () => void;
  onPickBrowserFile: () => void;
}

export function WorkingFileSetupDialog({
  open,
  fsAccessSupported,
  busy,
  onStartWithoutFile,
  onOpenFile,
  onCreateFile,
  onPickBrowserFile,
}: WorkingFileSetupDialogProps) {
  const t = useT();
  const titleId = useId();
  if (!open) return null;

  const layer = (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          {t("dialogs.welcomeTitle")}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{t("dialogs.workingFileSetupBody")}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onStartWithoutFile}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
          >
            {t("dialogs.startWithoutFile")}
          </button>
          {fsAccessSupported && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onCreateFile}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {t("dialogs.pickSaveLocation")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onOpenFile}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {t("dialogs.openExisting")}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onPickBrowserFile}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {t("dialogs.pickViaBrowser")}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
