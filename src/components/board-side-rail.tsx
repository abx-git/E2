"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  ClipboardList,
  BookOpen,
  CheckSquare,
  Flame,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { ActionItemsPanel } from "@/components/action-items-panel";
import { BookmarksPanel } from "@/components/bookmarks-panel";
import { ClipboardPanel } from "@/components/clipboard-panel";
import { ElementDetailSidebar } from "@/components/element-detail-sidebar";
import { FacilitatorPanel } from "@/components/facilitator-panel";
import { GlossaryPanel } from "@/components/glossary-panel";
import { HotspotList } from "@/components/hotspot-list";
import { clipboardItemCount } from "@/lib/board-clipboard";
import type { FacilitatorPhase } from "@/lib/facilitator-phases";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { ElementType, WorkshopFormat } from "@/types/storm-element";
import type { RelationType } from "@/types/storm-relation";

const STORAGE_KEY = "e2.side-rail.tab";

type RailTabId =
  | "clipboard"
  | "todos"
  | "hotspots"
  | "glossary"
  | "bookmarks"
  | "facilitator";

interface TabDef {
  id: RailTabId;
  label: string;
  icon: LucideIcon;
  badge?: number;
  available: boolean;
}

export interface BoardSideRailProps {
  onRequestHelpElementType?: (type: ElementType) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
  onRequestHelpPhase?: (phase: FacilitatorPhase, format: WorkshopFormat) => void;
}

export interface BoardSideRailContentProps extends BoardSideRailProps {
  /** Larger tab buttons for mobile bottom sheets. */
  touchFriendly?: boolean;
}

function readStoredTab(): RailTabId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (
      raw === "clipboard" ||
      raw === "todos" ||
      raw === "hotspots" ||
      raw === "glossary" ||
      raw === "bookmarks" ||
      raw === "facilitator"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredTab(id: RailTabId) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Inspector + tool tabs — shared between desktop rail and mobile sheet. */
export function BoardSideRailContent({
  onRequestHelpElementType,
  onRequestHelpRelationType,
  onRequestHelpPhase,
  touchFriendly = false,
}: BoardSideRailContentProps) {
  const clipboard = useStormBoardStore((s) => s.clipboard);
  const actionItems = useStormBoardStore((s) => s.actionItems);
  const elements = useStormBoardStore((s) => s.elements);
  const glossary = useStormBoardStore((s) => s.glossary);
  const bookmarks = useStormBoardStore((s) => s.bookmarks);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const selectedCanvasLineId = useStormBoardStore((s) => s.selectedCanvasLineId);
  const selectedBoundedContextIds = useStormBoardStore((s) => s.selectedBoundedContextIds);
  const selectedSwimlaneIds = useStormBoardStore((s) => s.selectedSwimlaneIds);

  const hasInspectorSelection =
    selectedElementIds.length > 0 ||
    Boolean(selectedRelationId) ||
    Boolean(selectedCanvasLineId) ||
    selectedBoundedContextIds.length > 0 ||
    selectedSwimlaneIds.length > 0;

  const clipboardCount = clipboardItemCount(clipboard);
  const openTodoCount = actionItems.filter((i) => i.status !== "done").length;
  const hotspotCount = elements.filter((e) => e.type === "hotspot").length;
  const facilitatorActive = facilitatorEnabled && workshopFormat !== "free";

  const tabs = useMemo<TabDef[]>(() => {
    const defs: TabDef[] = [
      {
        id: "clipboard",
        label: "Zwischenablage",
        icon: ClipboardList,
        badge: clipboardCount > 0 ? clipboardCount : undefined,
        available: true,
      },
      {
        id: "todos",
        label: "To-dos",
        icon: CheckSquare,
        badge: openTodoCount > 0 ? openTodoCount : undefined,
        available: true,
      },
      {
        id: "hotspots",
        label: "Hotspots",
        icon: Flame,
        badge: hotspotCount > 0 ? hotspotCount : undefined,
        available: hotspotCount > 0,
      },
      {
        id: "glossary",
        label: "Glossary",
        icon: BookOpen,
        badge: glossary.length > 0 ? glossary.length : undefined,
        available: true,
      },
      {
        id: "bookmarks",
        label: "Lesezeichen",
        icon: Bookmark,
        badge: bookmarks.length > 0 ? bookmarks.length : undefined,
        available: true,
      },
      {
        id: "facilitator",
        label: "Facilitator",
        icon: Timer,
        available: facilitatorActive,
      },
    ];
    return defs.filter((t) => t.available);
  }, [
    clipboardCount,
    openTodoCount,
    hotspotCount,
    glossary.length,
    bookmarks.length,
    facilitatorActive,
  ]);

  const [preferredTab, setPreferredTab] = useState<RailTabId | null>(() => readStoredTab());

  const activeTab = useMemo(() => {
    if (preferredTab && tabs.some((t) => t.id === preferredTab)) return preferredTab;
    if (openTodoCount > 0 && tabs.some((t) => t.id === "todos")) return "todos";
    if (clipboardCount > 0 && tabs.some((t) => t.id === "clipboard")) return "clipboard";
    return tabs.find((t) => t.id === "glossary")?.id ?? tabs[0]?.id ?? "glossary";
  }, [preferredTab, tabs, openTodoCount, clipboardCount]);

  const selectTab = (id: RailTabId) => {
    setPreferredTab(id);
    writeStoredTab(id);
  };

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? "";
  const tabBtnClass = touchFriendly ? "h-11 min-w-[2.75rem]" : "h-8 flex-1";
  const tabIconClass = touchFriendly ? "size-4" : "size-3.5";

  return (
    <>
      {hasInspectorSelection && (
        <div
          className={[
            "flex min-h-0 flex-col overflow-hidden border-b border-[var(--border)]",
            touchFriendly ? "max-h-[45%]" : "max-h-[55%]",
          ].join(" ")}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ElementDetailSidebar
              onRequestHelpElementType={onRequestHelpElementType}
              onRequestHelpRelationType={onRequestHelpRelationType}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex shrink-0 items-center gap-0.5 border-b border-[var(--border)] px-1.5 py-1"
          role="tablist"
          aria-label="Board-Werkzeuge"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                title={tab.label}
                aria-label={
                  tab.badge != null ? `${tab.label} (${tab.badge})` : tab.label
                }
                onClick={() => selectTab(tab.id)}
                className={[
                  "relative flex items-center justify-center rounded-md transition",
                  tabBtnClass,
                  selected
                    ? "bg-[var(--control)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)]",
                  !touchFriendly && "flex-1",
                ].join(" ")}
              >
                <Icon className={tabIconClass} aria-hidden />
                {tab.badge != null && (
                  <span className="absolute right-0.5 top-0.5 min-w-[0.9rem] rounded bg-[var(--accent)] px-0.5 text-center text-[9px] font-semibold leading-4 text-white">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" role="tabpanel">
          <div className="shrink-0 px-3 pb-0 pt-2.5">
            <h3 className="group-label">{activeLabel}</h3>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1.5">
            {activeTab === "clipboard" && <ClipboardPanel embedded />}
            {activeTab === "todos" && <ActionItemsPanel embedded />}
            {activeTab === "hotspots" && <HotspotList embedded />}
            {activeTab === "glossary" && <GlossaryPanel embedded />}
            {activeTab === "bookmarks" && <BookmarksPanel embedded />}
            {activeTab === "facilitator" && (
              <FacilitatorPanel embedded onRequestHelpPhase={onRequestHelpPhase} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function BoardSideRail(props: BoardSideRailProps) {
  return (
    <div className="dock-surface hidden w-72 shrink-0 flex-col overflow-hidden rounded-dock lg:flex">
      <BoardSideRailContent {...props} />
    </div>
  );
}

/** Badge count for mobile panel button (open todos + clipboard items). */
export function useSideRailActivityBadge(): number {
  const clipboard = useStormBoardStore((s) => s.clipboard);
  const actionItems = useStormBoardStore((s) => s.actionItems);
  return clipboardItemCount(clipboard) + actionItems.filter((i) => i.status !== "done").length;
}

/** Whether the inspector section would be visible (selection exists). */
export function useHasInspectorSelection(): boolean {
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const selectedCanvasLineId = useStormBoardStore((s) => s.selectedCanvasLineId);
  const selectedBoundedContextIds = useStormBoardStore((s) => s.selectedBoundedContextIds);
  const selectedSwimlaneIds = useStormBoardStore((s) => s.selectedSwimlaneIds);

  return (
    selectedElementIds.length > 0 ||
    Boolean(selectedRelationId) ||
    Boolean(selectedCanvasLineId) ||
    selectedBoundedContextIds.length > 0 ||
    selectedSwimlaneIds.length > 0
  );
}
