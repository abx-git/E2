"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface JsonPasteDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Placeholder shown in the empty textarea. */
  placeholder?: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
}

export function JsonPasteDialog({
  open,
  title,
  description,
  placeholder = '{ "format": "…", … }',
  confirmLabel = "Einfügen",
  busy,
  onClose,
  onConfirm,
}: JsonPasteDialogProps) {
  const titleId = useId();
  const areaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setText("");
    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const canSubmit = Boolean(text.trim()) && !busy;

  const layer = (
    <div
      className="fixed inset-0 z-[1400] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92vh,720px)] w-full max-w-3xl flex-col rounded-t-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-xl sm:rounded-xl sm:p-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-[var(--text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm text-[var(--muted)]">{description}</p>
        ) : null}

        <label htmlFor={areaId} className="sr-only">
          JSON
        </label>
        <textarea
          id={areaId}
          ref={textareaRef}
          value={text}
          disabled={busy}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          className="mt-3 min-h-[min(52vh,420px)] w-full flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2.5 font-mono text-[0.8rem] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--accent)]/40 disabled:opacity-60"
        />

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--control)] disabled:opacity-60"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(text)}
            className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/25 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
