"use client";

import { X } from "lucide-react";
import { useEffect, useId, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/i18n";

export interface ImagePreviewDialogProps {
  open: boolean;
  title: string;
  src: string | null;
  onClose: () => void;
}

export function ImagePreviewDialog({ open, title, src, onClose }: ImagePreviewDialogProps) {
  const t = useT();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey as EventListener);
    return () => window.removeEventListener("keydown", onKey as EventListener);
  }, [open, onClose]);

  if (!open || !src) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[1300] flex flex-col bg-slate-950/90 backdrop-blur-sm"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <h2 id={titleId} className="truncate text-sm font-medium">
          {title || t("elementType.image")}
        </h2>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 hover:bg-white/20"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className="max-h-[calc(100dvh-5rem)] max-w-full object-contain shadow-2xl"
        />
      </div>
    </div>
  );

  return createPortal(layer, document.body);
}