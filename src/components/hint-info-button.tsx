"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

export function HintInfoButton({
  ariaLabel,
  children,
  className = "",
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={["relative inline-flex shrink-0", className].join(" ")}>
      <button
        type="button"
        className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-[200] max-w-[min(18rem,85vw)] rounded-md border border-[var(--border)] bg-[var(--sidebar)] p-2 text-[10px] leading-snug text-[var(--muted)] shadow-md"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
