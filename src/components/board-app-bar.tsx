"use client";

import { type ReactNode } from "react";
import { Database, Loader2, Redo2, Undo2, Users } from "lucide-react";

import { BoardViewTabs } from "@/components/board-view-tabs";
import { isActionsView } from "@/lib/storm-json";
import { useCollabStore } from "@/lib/collab/session";
import { useStormBoardStore } from "@/store/storm-board-store";
import { useT } from "@/i18n";

export interface BoardAppBarProps {
  workingFileSaving: boolean;
  onOpenCollab: () => void;
  onOpenStorage: () => void;
  onPasteJsonAsNewView?: () => void;
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
  const undo = useStormBoardStore((s) => s.undo);
  const redo = useStormBoardStore((s) => s.redo);
  const pastLen = useStormBoardStore((s) => s.past.length);
  const futureLen = useStormBoardStore((s) => s.future.length);
  const activeView = useStormBoardStore((s) =>
    s.views.find((v) => v.id === s.activeViewId),
  );
  const isActionsActive = activeView ? isActionsView(activeView) : false;

  const collabActive = useCollabStore((s) => s.active);

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
        ) : null}

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
