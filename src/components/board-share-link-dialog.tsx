"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link2, Loader2 } from "lucide-react";

import {
  fetchAndValidateRemoteBoard,
  type RemoteBoardValidateOk,
} from "@/lib/board-remote-url";

export interface BoardShareLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BoardShareLinkDialog({ open, onClose }: BoardShareLinkDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawUrl, setRawUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RemoteBoardValidateOk | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setRawUrl("");
    setBusy(false);
    setError(null);
    setResult(null);
    setCopied(false);
    abortRef.current?.abort();
    abortRef.current = null;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
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

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!open) return null;

  const runCheck = async () => {
    const trimmed = rawUrl.trim();
    if (!trimmed || busy) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const outcome = await fetchAndValidateRemoteBoard(trimmed, { signal: ac.signal });
      if (ac.signal.aborted) return;
      if (!outcome.ok) {
        setError(outcome.reason);
        return;
      }
      setResult(outcome);
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!result?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  };

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
        className="w-full max-w-lg rounded-t-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl sm:rounded-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[var(--control)] p-2 text-[var(--text)]">
            <Link2 className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-[var(--text)]">
              Board-Link teilen
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Öffentliche URL zu einer{" "}
              <code className="rounded bg-[var(--control)] px-1 text-[0.75rem]">.storm.json</code>{" "}
              prüfen. Passt das Schema, erhältst du einen E2-Link zum Teilen.
            </p>
          </div>
        </div>

        <label htmlFor={inputId} className="mt-4 block text-xs font-medium text-[var(--muted)]">
          Remote-URL
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            ref={inputRef}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            value={rawUrl}
            placeholder="https://…/board.storm.json"
            onChange={(e) => {
              setRawUrl(e.target.value);
              setError(null);
              setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runCheck();
              }
            }}
            className="dock-field min-w-0 flex-1 font-mono text-[0.8rem]"
          />
          <button
            type="button"
            disabled={busy || !rawUrl.trim()}
            onClick={() => void runCheck()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/25 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Prüfen
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-3 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3">
            <p className="flex items-start gap-2 text-sm text-emerald-900">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Schema passt — <strong className="font-semibold">{result.title}</strong>
                <span className="text-emerald-800/80">
                  {" "}
                  · {result.viewCount} Sicht{result.viewCount === 1 ? "" : "en"} ·{" "}
                  {result.elementCount} Element{result.elementCount === 1 ? "" : "e"}
                </span>
              </span>
            </p>
            <div>
              <p className="text-xs font-medium text-emerald-900/80">Teilbarer E2-Link</p>
              <textarea
                readOnly
                rows={3}
                value={result.shareUrl}
                className="mt-1 w-full resize-none rounded-lg border border-emerald-200 bg-white px-2.5 py-2 font-mono text-[0.7rem] leading-relaxed text-slate-800"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? "Kopiert" : "Link kopieren"}
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-3 text-[0.7rem] leading-relaxed text-[var(--muted)]">
          Die Quelle muss CORS für die E2-Origin erlauben. Wer den Link öffnet, lädt das Board nach
          Bestätigung und arbeitet danach lokal weiter.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--control)] disabled:opacity-60"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
