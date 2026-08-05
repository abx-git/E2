"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, LayoutGrid, PanelRight, X } from "lucide-react";

import {
  BoardSideRailContent,
  useHasInspectorSelection,
  useSideRailActivityBadge,
} from "@/components/board-side-rail";
import { MobileSheetOverlay } from "@/components/mobile-sheet";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { placeElementAtViewportCenter } from "@/lib/place-element-on-canvas";
import { useIsMobileLayout } from "@/lib/use-media-query";
import { useStormBoardStore } from "@/store/storm-board-store";
import { MODELING_MODE_LABELS, partitionPaletteTypes, type ElementType } from "@/types/storm-element";
import type { FacilitatorPhase } from "@/lib/facilitator-phases";
import type { WorkshopFormat } from "@/types/storm-element";
import type { RelationType } from "@/types/storm-relation";

type MobileSheet = "palette" | "panel" | null;

export interface MobileBoardBarProps {
  onRequestHelpElementType?: (type: ElementType) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
  onRequestHelpPhase?: (phase: FacilitatorPhase, format: WorkshopFormat) => void;
}

/** Bottom bar + sheets for palette and side-rail tools on narrow viewports. */
export function MobileBoardBar({
  onRequestHelpElementType,
  onRequestHelpRelationType,
  onRequestHelpPhase,
}: MobileBoardBarProps) {
  const isMobile = useIsMobileLayout();
  const [openSheet, setOpenSheet] = useState<MobileSheet>(null);
  const activityBadge = useSideRailActivityBadge();
  const hasInspector = useHasInspectorSelection();

  useEffect(() => {
    if (!openSheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSheet]);

  if (!isMobile) return null;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-2 lg:hidden"
        data-canvas-chrome
      >
        <div
          className="pointer-events-auto dock-surface flex items-center gap-1 rounded-xl p-1 shadow-dock"
          role="toolbar"
          aria-label="Mobile-Werkzeuge"
        >
          <MobileBarButton
            label="Elemente"
            active={openSheet === "palette"}
            onClick={() => setOpenSheet((s) => (s === "palette" ? null : "palette"))}
          >
            <LayoutGrid className="size-5" aria-hidden />
          </MobileBarButton>
          <MobileBarButton
            label="Panel"
            active={openSheet === "panel"}
            badge={activityBadge > 0 ? activityBadge : hasInspector ? undefined : undefined}
            highlight={hasInspector && activityBadge === 0}
            onClick={() => setOpenSheet((s) => (s === "panel" ? null : "panel"))}
          >
            <PanelRight className="size-5" aria-hidden />
          </MobileBarButton>
        </div>
      </div>

      {openSheet === "palette" &&
        typeof document !== "undefined" &&
        createPortal(
          <MobileSheetOverlay onClose={() => setOpenSheet(null)} maxWidthClass="max-w-md">
            <MobilePaletteSheet
              onClose={() => setOpenSheet(null)}
              onRequestHelp={onRequestHelpElementType}
            />
          </MobileSheetOverlay>,
          document.body,
        )}

      {openSheet === "panel" &&
        typeof document !== "undefined" &&
        createPortal(
          <MobileSheetOverlay onClose={() => setOpenSheet(null)}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Werkzeuge
                </p>
                <h2 className="text-base font-semibold text-[var(--text)]">Panel</h2>
              </div>
              <button
                type="button"
                className="dock-control shrink-0 rounded-md p-2"
                aria-label="Schließen"
                onClick={() => setOpenSheet(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex min-h-[50vh] flex-col overflow-hidden rounded-lg border border-[var(--border)]">
              <BoardSideRailContent
                touchFriendly
                onRequestHelpElementType={onRequestHelpElementType}
                onRequestHelpRelationType={onRequestHelpRelationType}
                onRequestHelpPhase={onRequestHelpPhase}
              />
            </div>
          </MobileSheetOverlay>,
          document.body,
        )}
    </>
  );
}

function MobileBarButton({
  label,
  active,
  badge,
  highlight,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  highlight?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={[
        "relative flex h-11 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg px-3 transition touch-manipulation",
        active
          ? "dock-control-active"
          : highlight
            ? "bg-[rgba(42,157,143,0.12)] text-[var(--accent)]"
            : "text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]",
      ].join(" ")}
    >
      {children}
      <span className="text-[0.65rem] font-medium leading-none">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-1 min-w-[1rem] rounded-full bg-[var(--accent)] px-1 text-center text-[9px] font-semibold leading-4 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {highlight && badge == null && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--accent)]" />
      )}
    </button>
  );
}

function MobilePaletteSheet({
  onClose,
  onRequestHelp,
}: {
  onClose: () => void;
  onRequestHelp?: (type: ElementType) => void;
}) {
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const setPaletteType = useStormBoardStore((s) => s.setPaletteType);
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);

  const allowed = getAllowedTypesForPhase(
    modelingMode,
    workshopFormat,
    facilitatorPhase,
    facilitatorEnabled,
  );
  const { modeling, annotations } = partitionPaletteTypes(allowed);
  const modeLabel = MODELING_MODE_LABELS[modelingMode];

  const placeType = (type: ElementType) => {
    setPaletteType(type);
    placeElementAtViewportCenter(type);
    onClose();
  };

  const renderTypeButton = (type: ElementType) => {
    const style = ELEMENT_STYLES[type];
    const active = paletteType === type;
    return (
      <div key={type} className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => placeType(type)}
          className={[
            "flex min-h-[2.75rem] flex-1 items-center justify-center rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition touch-manipulation",
            active
              ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel-solid)]"
              : "opacity-90 hover:opacity-100",
          ].join(" ")}
          style={{
            backgroundColor: style.fill,
            borderColor: style.stroke,
            color: style.ink,
          }}
        >
          {style.label}
        </button>
        {onRequestHelp && (
          <button
            type="button"
            className="dock-control shrink-0 self-center rounded-md p-2 touch-manipulation"
            title="Hilfe"
            aria-label={`Hilfe für ${type}`}
            onClick={(e) => {
              e.stopPropagation();
              onRequestHelp(type);
            }}
          >
            <HelpCircle className="size-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Elemente
          </p>
          <h2 className="text-base font-semibold text-[var(--text)]">Palette</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {modeLabel} · Tippen zum Einfügen in der Bildmitte
          </p>
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {modeling.map(renderTypeButton)}
      </div>
      {annotations.length > 0 && (
        <div className="mt-4 border-t border-dashed border-[var(--border)] pt-3">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Annotationen
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {annotations.map(renderTypeButton)}
          </div>
        </div>
      )}
    </>
  );
}
