"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import type { HelpDialogModel } from "@/lib/storm-help";

export interface HelpDialogProps {
  open: boolean;
  model: HelpDialogModel | null;
  onClose: () => void;
}

export function HelpDialog({ open, model, onClose }: HelpDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !model) return null;

  const { title, subtitle, paragraphs, bullets, chips } = model;

  const layer = (
    <div
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {chips && chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                {c}
              </span>
            ))}
          </div>
        )}

        {paragraphs && paragraphs.length > 0 && (
          <div className="mt-4 space-y-2">
            {paragraphs.map((p, idx) => (
              <p key={`${idx}-${p}`} className="text-sm leading-relaxed text-slate-700">
                {p}
              </p>
            ))}
          </div>
        )}

        {bullets && bullets.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {bullets
              .filter((b) => b.trim().length > 0)
              .map((b) => (
                <li key={b}>{b}</li>
              ))}
          </ul>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}

