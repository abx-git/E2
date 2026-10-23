"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";

import { useT } from "@/i18n";
import { isWorkingFileSupported } from "@/lib/working-file";

export type CollabEnterChoice =
  | "proceed"
  | "save_and_proceed"
  | "join_with_disk"
  | "cancel";

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
  const t = useT();
  const titleId = useId();
  if (!open) return null;

  const isJoin = mode === "join";
  const showSaveAndProceed = workingFileAttached && workingFileDirty;
  const showCreateProceed = !isJoin && (workingFileAttached ? !workingFileDirty : false);
  const diskJoinAvailable = isJoin && isWorkingFileSupported();

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
          {isJoin ? t("collab.enterJoinTitle") : t("collab.enterCreateTitle")}
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          {isJoin && boardHasContent && <p>{t("dialogs.collabEnterJoinReplace")}</p>}
          {!isJoin && boardHasContent && <p>{t("dialogs.collabEnterBoardAdopted")}</p>}
          {workingFileAttached ? (
            <p>{t("dialogs.collabEnterFileSafe")}</p>
          ) : (
            !isJoin && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                {t("dialogs.collabEnterDirty")}
              </p>
            )
          )}
          {isJoin ? (
            <p className="text-slate-500">{t("dialogs.collabEnterGuestLocalHint")}</p>
          ) : null}
          <p className="text-slate-500">{t("dialogs.collabEnterExportOptional")}</p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onExportJson}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {t("dialogs.exportJsonButton")}
          </button>
          {showSaveAndProceed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("save_and_proceed")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:opacity-60"
            >
              {isJoin ? t("collab.saveAndJoin") : t("collab.saveAndCreate")}
            </button>
          )}
          {diskJoinAvailable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("join_with_disk")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:opacity-60"
            >
              {t("collab.joinWithDisk")}
            </button>
          )}
          {isJoin && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("proceed")}
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
            >
              {t("collab.joinWithoutSave")}
            </button>
          )}
          {showCreateProceed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose("proceed")}
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
            >
              {t("collab.createRoom")}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("cancel")}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
