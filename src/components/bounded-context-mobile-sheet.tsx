"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { BoundedContextDetailPanel } from "@/components/bounded-context-detail-panel";
import { MobileSheetOverlay } from "@/components/mobile-sheet";
import { useIsMobileLayout } from "@/lib/use-media-query";
import { useStormBoardStore } from "@/store/storm-board-store";

export interface BoundedContextMobileSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Bottom sheet for bounded-context details on narrow viewports. */
export function BoundedContextMobileSheet({ open, onClose }: BoundedContextMobileSheetProps) {
  const isMobile = useIsMobileLayout();
  const selectedBoundedContextId = useStormBoardStore(
    (s) => s.selectedBoundedContextIds[0] ?? null,
  );
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const selectedBoundedContext = boundedContexts.find((b) => b.id === selectedBoundedContextId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!isMobile || !open || !selectedBoundedContext) return null;

  return createPortal(
    <MobileSheetOverlay onClose={onClose}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Bounded Context
          </p>
          <h2 className="truncate text-base font-semibold text-[var(--text)]">
            {selectedBoundedContext.label}
          </h2>
        </div>
        <button
          type="button"
          className="dock-control shrink-0 rounded-md p-2"
          aria-label="Schließen"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>
      <BoundedContextDetailPanel
        boundedContext={selectedBoundedContext}
        compact
        onDetailViewOpened={onClose}
      />
    </MobileSheetOverlay>,
    document.body,
  );
}

/** Quick actions when a bounded context is selected on mobile. */
export function BoundedContextMobileActions({
  onOpenDetails,
}: {
  onOpenDetails: () => void;
}) {
  const isMobile = useIsMobileLayout();
  const selectedBoundedContextId = useStormBoardStore(
    (s) => s.selectedBoundedContextIds[0] ?? null,
  );
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const openBoundedContextView = useStormBoardStore((s) => s.openBoundedContextView);
  const views = useStormBoardStore((s) => s.views);

  const bc = boundedContexts.find((b) => b.id === selectedBoundedContextId);

  if (!isMobile || !bc) return null;

  const linkedView = bc.detailViewId
    ? views.find((v) => v.id === bc.detailViewId)
    : undefined;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] z-40 flex justify-center px-3 lg:hidden">
      <div className="pointer-events-auto flex max-w-md flex-wrap items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)]/95 p-2 shadow-dock backdrop-blur-sm">
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-xs font-medium text-[var(--text)]"
          onClick={onOpenDetails}
        >
          Details
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--accent)] bg-[rgba(42,157,143,0.15)] px-3 py-2 text-xs font-medium text-[var(--text)]"
          onClick={() => openBoundedContextView(bc.id)}
        >
          {linkedView ? `Sicht: ${linkedView.name}` : "Detail-Sicht erstellen"}
        </button>
      </div>
    </div>
  );
}

