"use client";

import type { ReactNode } from "react";

export interface MobileSheetOverlayProps {
  children: ReactNode;
  onClose: () => void;
  /** Optional max width class (default max-w-lg). */
  maxWidthClass?: string;
}

/** Shared bottom-sheet overlay for mobile panels. */
export function MobileSheetOverlay({
  children,
  onClose,
  maxWidthClass = "max-w-lg",
}: MobileSheetOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[1250] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "dock-surface max-h-[min(85vh,720px)] w-full overflow-y-auto rounded-t-xl p-5 shadow-dock",
          maxWidthClass,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
