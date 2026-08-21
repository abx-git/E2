"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { MDXEditorMethods } from "@mdxeditor/editor";

import { normalizeDescriptionMarkdown } from "@/lib/description-markdown";
import { DescriptionMarkdownEditor } from "@/components/description-markdown-editor";

export interface DescriptionEditorDialogProps {
  open: boolean;
  elementId: string | null;
  elementLabel?: string;
  markdown: string;
  onClose: () => void;
  onSave: (markdown: string) => void;
}

/** WYSIWYG markdown dialog for an element description — same pattern as ET2. */
export function DescriptionEditorDialog({
  open,
  elementId,
  elementLabel,
  markdown,
  onClose,
  onSave,
}: DescriptionEditorDialogProps) {
  const titleId = useId();
  const markdownId = useId();
  const [markdownSeed, setMarkdownSeed] = useState("");
  const [draft, setDraft] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<MDXEditorMethods>(null);

  useEffect(() => {
    if (!open || !elementId) return;
    const md = markdown ?? "";
    setDraft(md);
    setMarkdownSeed(md);
    setEditorKey((k) => k + 1);
    // Seed only when opening / switching element — not on every store tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/elementId gate
  }, [open, elementId]);

  useEffect(() => {
    if (!open || !elementId) return;
    const t = window.setTimeout(() => {
      editorRef.current?.focus(undefined, { preventScroll: true, defaultSelection: "rootEnd" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, elementId, editorKey]);

  if (!open || !elementId) return null;

  const currentMarkdown = () =>
    normalizeDescriptionMarkdown(editorRef.current?.getMarkdown() ?? draft);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(currentMarkdown());
    onClose();
  };

  const layer = (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-[min(92dvh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white text-slate-900 shadow-2xl shadow-slate-900/20 sm:h-[min(88vh,44rem)] sm:rounded-2xl"
        onPointerDown={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-4 pb-3 pt-3.5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-sm font-semibold text-slate-900">
              Beschreibung
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {elementLabel?.trim() ? elementLabel.trim() : "WYSIWYG · Quelltext in der Toolbar"}
            </p>
            {elementLabel?.trim() ? (
              <p className="text-[10px] text-slate-400">WYSIWYG · Quelltext in der Toolbar</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
          <div
            id={markdownId}
            className="description-mdx-editor flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-teal-600/40"
          >
            <DescriptionMarkdownEditor
              key={editorKey}
              ref={editorRef}
              className="mdxeditor-full-height"
              markdown={markdownSeed}
              onChange={(value) => setDraft(value)}
              contentEditableClassName="description-mdx-content min-h-[10rem] px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none"
              placeholder="Beschreibung schreiben…"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="h-9 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800"
          >
            Speichern
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}
