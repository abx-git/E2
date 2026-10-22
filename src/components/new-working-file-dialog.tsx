"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/i18n";
import { suggestedWorkingFileName } from "@/lib/working-file";

export type NewWorkingFileChoice =
  | { action: "cancel" }
  | { action: "create_with_file"; title: string; suggestedFileName: string }
  | { action: "empty_without_file"; title: string };

export interface NewWorkingFileDialogProps {
  open: boolean;
  busy?: boolean;
  /** Current working-file label, if any. */
  currentFileName?: string | null;
  hasUnsavedChanges?: boolean;
  hasBoardContent?: boolean;
  fsAccessSupported?: boolean;
  onChoose: (choice: NewWorkingFileChoice) => void;
}

export function NewWorkingFileDialog({
  open,
  busy,
  currentFileName,
  hasUnsavedChanges,
  hasBoardContent,
  fsAccessSupported = true,
  onChoose,
}: NewWorkingFileDialogProps) {
  const t = useT();
  const titleId = useId();
  const nameId = useId();
  const defaultTitle = t("dialogs.newFileDefaultTitle");
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
  }, [open, defaultTitle]);

  const suggestedFileName = useMemo(
    () => suggestedWorkingFileName(title || "board"),
    [title],
  );

  if (!open) return null;

  const warnDiscard = Boolean(hasUnsavedChanges || hasBoardContent);

  const layer = (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
          {t("dialogs.newFileTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("dialogs.newFileBody")}</p>

        {warnDiscard && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {hasUnsavedChanges
              ? t("dialogs.newFileDiscardUnsaved")
              : t("dialogs.newFileDiscardContent")}
            {currentFileName ? (
              <> {t("dialogs.newFileKeepOnDisk", { file: currentFileName })}</>
            ) : null}
          </p>
        )}

        <label htmlFor={nameId} className="mt-4 block text-xs font-medium text-slate-700">
          {t("dialogs.newFileBoardTitle")}
        </label>
        <input
          id={nameId}
          type="text"
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
          placeholder={defaultTitle}
          autoFocus
        />
        <p className="mt-1.5 text-[0.7rem] text-slate-500">
          {t("dialogs.newFileSuggestedFilename")}{" "}
          <span className="font-medium text-slate-700">{suggestedFileName}</span>
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {fsAccessSupported ? (
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() =>
                onChoose({
                  action: "create_with_file",
                  title: title.trim() || defaultTitle,
                  suggestedFileName,
                })
              }
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-left text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
            >
              {t("dialogs.newFileCreateWithFile")}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() =>
              onChoose({
                action: "empty_without_file",
                title: title.trim() || defaultTitle,
              })
            }
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {fsAccessSupported ? t("dialogs.newFileEmptyWithoutFile") : t("dialogs.newFileEmptyOnly")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose({ action: "cancel" })}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
