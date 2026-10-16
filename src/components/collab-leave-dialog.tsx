"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/i18n";

export type CollabLeaveChoice = "leave" | "restore_pre_collab";

export interface CollabLeaveDialogProps {
  open: boolean;
  hasPreCollabStash: boolean;
  preCollabFileLabel: string | null;
  busy?: boolean;
  onChoose: (choice: CollabLeaveChoice) => void;
  onCancel: () => void;
}

export function CollabLeaveDialog({
  open,
  hasPreCollabStash,
  preCollabFileLabel,
  busy,
  onChoose,
  onCancel,
}: CollabLeaveDialogProps) {
  const t = useT();
  const titleId = useId();
  const [pending, setPending] = useState<CollabLeaveChoice | null>(null);
  if (!open) return null;

  const stashLabel = preCollabFileLabel?.trim()
    ? t("collab.restorePreCollabNamed", { file: preCollabFileLabel.trim() })
    : t("collab.restorePreCollab");

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
          {t("collab.leaveTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("collab.leaveBody")}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("leave")}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-left text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-60"
          >
            <span className="block">{t("collab.leaveConfirm")}</span>
            <span className="mt-0.5 block text-[0.72rem] font-normal text-sky-900/70">
              {t("collab.leaveConfirmHint")}
            </span>
          </button>
          {hasPreCollabStash && (
            <button
              type="button"
              disabled={busy}
              onClick={() => choose("restore_pre_collab")}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-left text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              <span className="block">{stashLabel}</span>
              <span className="mt-0.5 block text-[0.72rem] font-normal text-amber-900/70">
                {t("collab.restorePreCollabHint")}
              </span>
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
        </div>
        {busy && pending && (
          <p className="mt-3 text-[0.72rem] text-slate-500">{t("common.pleaseWait")}</p>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
