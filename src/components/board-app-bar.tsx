"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Database,
  Loader2,
  Presentation,
  Redo2,
  Undo2,
  Users,
} from "lucide-react";

import { BoardViewTabs } from "@/components/board-view-tabs";
import { getFacilitatorFormatsForMode } from "@/lib/facilitator-phases";
import { isActionsView } from "@/lib/storm-json";
import { useCollabStore } from "@/lib/collab/session";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ModelingMode, WorkshopFormat } from "@/types/storm-element";
import { MODELING_MODES } from "@/types/storm-element";
import {
  modelingModeLabel,
  useT,
  workshopFormatLabel,
} from "@/i18n";
import type { TranslateFn } from "@/i18n/translate";

export interface BoardAppBarProps {
  workingFileSaving: boolean;
  onOpenCollab: () => void;
  onOpenStorage: () => void;
  onPasteJsonAsNewView?: () => void;
}

function formatOptionsForMode(
  t: TranslateFn,
  mode: ModelingMode,
): { value: WorkshopFormat; label: string }[] {
  return [
    { value: "free", label: workshopFormatLabel(t, "free") },
    ...getFacilitatorFormatsForMode(mode).map((f) => ({
      value: f.format,
      label: workshopFormatLabel(t, f.format),
    })),
  ];
}

function IconButton({
  onClick,
  disabled,
  title,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={[
        "rounded-lg p-2 transition disabled:opacity-35",
        active
          ? "dock-control-active"
          : "text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--text)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function BoardAppBar({
  workingFileSaving,
  onOpenCollab,
  onOpenStorage,
  onPasteJsonAsNewView,
}: BoardAppBarProps) {
  const t = useT();
  const title = useStormBoardStore((s) => s.title);
  const setTitle = useStormBoardStore((s) => s.setTitle);
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const setModelingMode = useStormBoardStore((s) => s.setModelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const setWorkshopFormat = useStormBoardStore((s) => s.setWorkshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const setFacilitatorEnabled = useStormBoardStore((s) => s.setFacilitatorEnabled);
  const workshopMode = useStormBoardStore((s) => s.workshopMode);
  const setWorkshopMode = useStormBoardStore((s) => s.setWorkshopMode);
  const undo = useStormBoardStore((s) => s.undo);
  const redo = useStormBoardStore((s) => s.redo);
  const pastLen = useStormBoardStore((s) => s.past.length);
  const futureLen = useStormBoardStore((s) => s.future.length);
  const activeView = useStormBoardStore((s) =>
    s.views.find((v) => v.id === s.activeViewId),
  );
  const isActionsActive = activeView ? isActionsView(activeView) : false;

  const collabActive = useCollabStore((s) => s.active);

  const [sessionOpen, setSessionOpen] = useState(false);
  const sessionBtnRef = useRef<HTMLButtonElement>(null);
  const sessionPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionOpen) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (sessionPanelRef.current?.contains(target) || sessionBtnRef.current?.contains(target)) return;
      setSessionOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSessionOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [sessionOpen]);

  const formatOptions = formatOptionsForMode(t, modelingMode);

  const sessionSummary =
    workshopFormat === "free"
      ? workshopFormatLabel(t, "free")
      : facilitatorEnabled
        ? t("appBar.facilitator")
        : (formatOptions.find((o) => o.value === workshopFormat)?.label ?? t("appBar.workshop"));

  return (
    <header className="dock-surface relative z-40 mx-3 mt-3 shrink-0 rounded-dock">
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[0.95rem] font-semibold tracking-tight text-[var(--text)] placeholder:text-[var(--muted)] hover:border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => useStormBoardStore.getState().beginGesture()}
          onBlur={() => useStormBoardStore.getState().endGesture()}
          aria-label={t("appBar.boardTitle")}
          placeholder={t("common.unnamedBoard")}
        />

        {isActionsActive ? (
          <span
            className="dock-control max-w-[12rem] shrink-0 truncate rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted)]"
            title={t("appBar.viewKindMeasuresHint")}
          >
            {t("appBar.viewKindMeasures")}
          </span>
        ) : (
          <>
            <label className="sr-only" htmlFor="modeling-mode">
              {t("appBar.modelingMode")}
            </label>
            <select
              id="modeling-mode"
              className="dock-control max-w-[9.5rem] shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium md:max-w-[12rem]"
              value={modelingMode}
              onChange={(e) => setModelingMode(e.target.value as ModelingMode)}
            >
              {MODELING_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {modelingModeLabel(t, mode)}
                </option>
              ))}
            </select>
          </>
        )}

        <div className="relative shrink-0">
          <button
            ref={sessionBtnRef}
            type="button"
            onClick={() => setSessionOpen((v) => !v)}
            aria-expanded={sessionOpen}
            aria-haspopup="dialog"
            className={[
              "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium",
              sessionOpen || facilitatorEnabled || workshopMode
                ? "dock-control-active"
                : "dock-control",
            ].join(" ")}
            title={t("appBar.workshopFacilitator")}
          >
            <Presentation className="h-3.5 w-3.5" />
            <span className="hidden max-w-[6.5rem] truncate sm:inline">{sessionSummary}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          {sessionOpen && (
            <div
              ref={sessionPanelRef}
              className="dock-surface absolute right-0 top-[calc(100%+0.4rem)] z-50 min-w-[16rem] rounded-xl p-3 shadow-dock"
              role="dialog"
              aria-label={t("appBar.sessionSettings")}
            >
              <p className="group-label mb-2">{t("appBar.session")}</p>
              <label className="mb-1 block text-[0.7rem] text-[var(--muted)]" htmlFor="workshop-format">
                {t("appBar.sessionFormat")}
              </label>
              <select
                id="workshop-format"
                className="dock-field mb-3"
                value={workshopFormat}
                onChange={(e) => setWorkshopFormat(e.target.value as WorkshopFormat)}
              >
                {formatOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={facilitatorEnabled}
                  disabled={workshopFormat === "free"}
                  onChange={(e) => setFacilitatorEnabled(e.target.checked)}
                />
                {t("appBar.facilitatorPhases")}
              </label>
              <label
                className="flex cursor-pointer items-center gap-2 text-sm"
                title={t("appBar.syncActiveTabTitle")}
              >
                <input
                  type="checkbox"
                  checked={workshopMode}
                  onChange={(e) => setWorkshopMode(e.target.checked)}
                />
                {t("appBar.syncActiveTabShort")}
              </label>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton onClick={() => undo()} disabled={pastLen === 0} title={t("appBar.undo")}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={() => redo()} disabled={futureLen === 0} title={t("appBar.redo")}>
            <Redo2 className="h-4 w-4" />
          </IconButton>

          <span className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" aria-hidden />

          <IconButton
            onClick={onOpenCollab}
            title={t("appBar.collabRoom")}
            active={collabActive}
          >
            <Users className="h-4 w-4" />
          </IconButton>
          <button
            type="button"
            onClick={onOpenStorage}
            className="dock-control ml-0.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
            title={t("appBar.dataPanel")}
          >
            {workingFileSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t("appBar.data")}</span>
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-1">
        <BoardViewTabs onPasteJsonAsNewView={onPasteJsonAsNewView} />
      </div>
    </header>
  );
}
