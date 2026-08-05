"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock, ExternalLink, LayoutDashboard, MoreVertical, RotateCcw, RotateCw } from "lucide-react";

import { isPointerOverClipboardDrop } from "@/lib/board-clipboard";
import { activateBoardLink, linkDestinationPreview, linkHasTarget } from "@/lib/board-link";
import { resolveBuildingBlockViewNavigation } from "@/lib/building-block-view";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import {
  cardAttributeLines,
  cardMethodLines,
  cardShowsDetails,
} from "@/lib/card-preview";
import { matchElementSearch, normalizeSearchQuery } from "@/lib/element-search";
import {
  effectiveElementRotation,
  normalizeRotationDegrees,
  snapRotationDegrees,
} from "@/lib/element-rotation";
import { cssStackingZIndex } from "@/lib/element-z-order";
import { expandCanvasMoveSet, selectionItemCount } from "@/lib/selection-move";
import { hexToRgba } from "@/lib/region-style";
import { HighlightedText } from "@/components/highlighted-text";
import { resolveNoteColor } from "@/lib/note-colors";
import { useIsCoarsePointer } from "@/lib/use-media-query";
import { useStormBoardStore } from "@/store/storm-board-store";
import {
  elementTypesForMode,
  isArchBuildingBlockType,
  isC4ElementType,
  isCloudElementType,
  isNoteLike,
  supportsArchDrilldown,
  type StormElement,
} from "@/types/storm-element";

const DRAG_THRESHOLD_PX = 6;
const MIN_SIZE = 40;
const ROTATION_SNAP_STEP = 15;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;
/** Semi-transparent boundary so nested stickies stay readable. */
const BOUNDARY_FILL_OPACITY = 0.38;

const SUBDOMAIN_KIND_LABEL: Record<string, string> = {
  core: "Core",
  supporting: "Supporting",
  generic: "Generic",
};

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLE_POSITIONS: Record<ResizeHandle, string> = {
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
};

export interface StormElementCardProps {
  element: StormElement;
  selected: boolean;
  selectedIds: string[];
  connecting: boolean;
  isRelationTargetHint: boolean;
  relationMode: boolean;
  zoom: number;
  onSelect: (id: string, additive: boolean) => void;
  onMoveMany: (updates: {
    elements?: Array<{ id: string; x: number; y: number }>;
    swimlanes?: Array<{ id: string; x: number; y: number }>;
    boundedContexts?: Array<{ id: string; x: number; y: number }>;
  }) => void;
  onResize: (id: string, patch: { x: number; y: number; width: number; height: number }) => void;
  onStartConnect: (id: string) => void;
  onCompleteConnect: (id: string) => void;
}

export function StormElementCard({
  element,
  selected,
  selectedIds,
  connecting,
  isRelationTargetHint,
  relationMode,
  zoom,
  onSelect,
  onMoveMany,
  onResize,
  onStartConnect,
  onCompleteConnect,
}: StormElementCardProps) {
  const style = ELEMENT_STYLES[element.type];
  const w = element.width ?? style.defaultWidth;
  const h = element.height ?? style.defaultHeight;
  const rotation = effectiveElementRotation(element.rotation, style.rotation);
  const draggedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const draftRef = useRef(element.label);
  const editingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(element.label);
  const isNote = element.type === "note";
  const isInstruction = element.type === "instruction";
  const isLink = element.type === "link";
  const isAggregate = element.type === "aggregate";
  const isSubdomain = element.type === "subdomain";
  const isWhitebox = element.type === "archWhitebox";
  const isCloudBoundary = element.type === "cloudBoundary";
  const isBoundary = isAggregate || isSubdomain || isWhitebox || isCloudBoundary;
  const showArchTypeBadge =
    isC4ElementType(element.type) ||
    isArchBuildingBlockType(element.type) ||
    isCloudElementType(element.type);
  const noteLike = isNoteLike(element.type);
  const linkReady = isLink && linkHasTarget(element);
  const linkKind = element.metadata?.linkKind ?? "external";
  const noteColors = isNote ? resolveNoteColor(element.metadata?.noteColor) : null;
  const colors = {
    bg: noteColors?.fill ?? style.fill,
    border: noteColors?.stroke ?? style.stroke,
    text: noteColors?.ink ?? style.ink,
  };
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const inActiveMode = elementTypesForMode(modelingMode).includes(element.type);
  const focusMode = useStormBoardStore((s) => s.focusMode);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const searchQuery = useStormBoardStore((s) => s.searchQuery);
  const editingElementId = useStormBoardStore((s) => s.editingElementId);
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);
  const openBuildingBlockView = useStormBoardStore((s) => s.openBuildingBlockView);
  const navigateBuildingBlockViewLink = useStormBoardStore((s) => s.navigateBuildingBlockViewLink);
  const viewNameById = Object.fromEntries(views.map((v) => [v.id, v.name]));
  const linkPreview = isLink
    ? linkDestinationPreview(element, { viewNameById })
    : null;
  const archNav = supportsArchDrilldown(element.type)
    ? resolveBuildingBlockViewNavigation(element, activeViewId, views)
    : null;
  const searchActive = Boolean(normalizeSearchQuery(searchQuery));
  const searchHit = searchActive
    ? matchElementSearch(element, searchQuery, { viewNameById })
    : null;
  const dimForFocus = focusMode && element.type !== paletteType;
  const dimForSearch = searchActive && !searchHit?.match;
  const dimmed = dimForFocus || dimForSearch;
  const searchEmphasize = Boolean(searchHit?.emphasizeCard);
  const showDetails = cardShowsDetails(element);
  const attrLines = element.metadata?.showAttributesOnCard
    ? cardAttributeLines(element, { viewNameById })
    : [];
  const methodLines = element.metadata?.showMethodsOnCard ? cardMethodLines(element) : [];
  const showDescription =
    Boolean(element.metadata?.showDescriptionOnCard) && Boolean(element.description?.trim());
  const isCoarsePointer = useIsCoarsePointer();

  const shapeClass =
    style.shape === "pill"
      ? "rounded-full"
      : style.shape === "wide"
        ? "rounded-md"
        : style.shape === "rectangle"
          ? "rounded-sm"
          : "rounded-lg";

  const setDraftValue = (value: string) => {
    draftRef.current = value;
    setDraft(value);
  };

  const beginEdit = () => {
    setDraftValue(element.label);
    editingRef.current = true;
    setEditing(true);
  };

  const commitLabel = (value: string) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    const next = value.trim() || ELEMENT_STYLES[element.type].label;
    setEditing(false);
    if (next !== element.label) {
      useStormBoardStore.getState().updateElement(element.id, { label: next });
    }
  };

  const cancelEdit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setDraftValue(element.label);
    setEditing(false);
  };

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  useEffect(() => {
    if (editingElementId !== element.id) return;
    beginEdit();
    useStormBoardStore.getState().clearEditingElementId();
  }, [editingElementId, element.id]);

  useEffect(() => {
    if (!selected && editingRef.current) {
      commitLabel(draftRef.current);
    }
  }, [selected]);

  useEffect(() => {
    if (!editing) {
      setDraftValue(element.label);
    }
  }, [element.label, editing]);

  const handleConnect = () => {
    if (connecting) onCompleteConnect(element.id);
    else onStartConnect(element.id);
  };

  const openElementContextMenu = (clientX: number, clientY: number) => {
    if (editing) commitLabel(draftRef.current);
    const store = useStormBoardStore.getState();
    if (!store.selectedElementIds.includes(element.id)) {
      store.selectElement(element.id);
    }
    const ids = store.selectedElementIds.includes(element.id)
      ? store.selectedElementIds
      : [element.id];
    store.openContextMenu(
      clientX,
      clientY,
      ids.length > 1 ? { kind: "elements", ids } : { kind: "element", id: element.id },
    );
  };

  const startResize = (handle: ResizeHandle, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    useStormBoardStore.getState().beginGesture();

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: element.x, y: element.y, width: w, height: h };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;

      let x = orig.x;
      let y = orig.y;
      let width = orig.width;
      let height = orig.height;

      if (handle.includes("e")) width = Math.max(MIN_SIZE, orig.width + dx);
      if (handle.includes("s")) height = Math.max(MIN_SIZE, orig.height + dy);
      if (handle.includes("w")) {
        const nextWidth = Math.max(MIN_SIZE, orig.width - dx);
        x = orig.x + (orig.width - nextWidth);
        width = nextWidth;
      }
      if (handle.includes("n")) {
        const nextHeight = Math.max(MIN_SIZE, orig.height - dy);
        y = orig.y + (orig.height - nextHeight);
        height = nextHeight;
      }

      onResize(element.id, { x, y, width, height });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      useStormBoardStore.getState().endGesture();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startRotate = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    useStormBoardStore.getState().beginGesture();

    const card = e.currentTarget.parentElement;
    if (!card) {
      useStormBoardStore.getState().endGesture();
      return;
    }

    const centerOf = () => {
      const rect = card.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const angleAt = (clientX: number, clientY: number) => {
      const c = centerOf();
      return (Math.atan2(clientY - c.y, clientX - c.x) * 180) / Math.PI;
    };

    const startPointerAngle = angleAt(e.clientX, e.clientY);
    const startRotation = rotation;

    const onMove = (ev: PointerEvent) => {
      const delta = angleAt(ev.clientX, ev.clientY) - startPointerAngle;
      let next = startRotation + delta;
      if (ev.shiftKey) next = snapRotationDegrees(next, ROTATION_SNAP_STEP);
      else next = normalizeRotationDegrees(next);
      useStormBoardStore.getState().updateElement(element.id, { rotation: next });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      useStormBoardStore.getState().endGesture();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const labelClass = [
    "text-xs font-semibold leading-tight",
    noteLike && !showDetails
      ? "line-clamp-6 w-full whitespace-pre-wrap text-left"
      : showDetails || isBoundary
        ? "line-clamp-2 w-full text-left"
        : "line-clamp-3 text-center",
  ].join(" ");

  const editorClass = [
    "w-full resize-none bg-transparent text-xs font-semibold leading-tight outline-none ring-0",
    noteLike ? "h-full whitespace-pre-wrap text-left" : showDetails || isBoundary ? "text-left" : "text-center",
  ].join(" ");

  return (
    <div
      className="group absolute select-none touch-manipulation"
      style={{
        left: element.x,
        top: element.y,
        width: w,
        height: h,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
        zIndex:
          cssStackingZIndex(element, {
            elevated: selected || connecting || editing || searchEmphasize,
            highlighted:
              (focusMode && !dimForFocus) || (searchActive && Boolean(searchHit?.match)),
          }),
        opacity: dimmed ? 0.28 : undefined,
        filter: dimmed ? "saturate(0.55) brightness(0.72)" : undefined,
        transition: "opacity 120ms ease, filter 120ms ease",
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (editing) {
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        draggedRef.current = false;
        useStormBoardStore.getState().beginGesture();

        const startX = e.clientX;
        const startY = e.clientY;
        const isTouch = e.pointerType === "touch";
        let longPressTriggered = false;
        let longPressTimer: ReturnType<typeof setTimeout> | null = null;

        const cancelLongPress = () => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        };

        if (isTouch) {
          longPressTimer = setTimeout(() => {
            longPressTriggered = true;
            cancelLongPress();
            openElementContextMenu(startX, startY);
          }, LONG_PRESS_MS);
        }

        const store = useStormBoardStore.getState();
        const multiSelected =
          selected &&
          selectedIds.includes(element.id) &&
          selectionItemCount({
            elementIds: selectedIds,
            swimlaneIds: store.selectedSwimlaneIds,
            boundedContextIds: store.selectedBoundedContextIds,
          }) > 1;

        const baseSelection = multiSelected
          ? {
              elementIds: selectedIds,
              swimlaneIds: store.selectedSwimlaneIds,
              boundedContextIds: store.selectedBoundedContextIds,
            }
          : {
              elementIds: [element.id],
              swimlaneIds: [] as string[],
              boundedContextIds: [] as string[],
            };

        const moveSet = expandCanvasMoveSet(
          store.elements,
          store.swimlanes,
          store.boundedContexts,
          baseSelection,
        );

        const elementOrigins = new Map(
          store.elements
            .filter((el) => moveSet.elementIds.includes(el.id))
            .map((el) => [el.id, { x: el.x, y: el.y }] as const),
        );
        const swimlaneOrigins = new Map(
          store.swimlanes
            .filter((lane) => moveSet.swimlaneIds.includes(lane.id) && !lane.locked)
            .map((lane) => [lane.id, { x: lane.x ?? 0, y: lane.y }] as const),
        );
        const bcOrigins = new Map(
          store.boundedContexts
            .filter((bc) => moveSet.boundedContextIds.includes(bc.id) && !bc.locked)
            .map((bc) => [bc.id, { x: bc.x, y: bc.y }] as const),
        );

        const buildUpdates = (worldDx: number, worldDy: number) => {
          const orderedElementIds = [
            element.id,
            ...moveSet.elementIds.filter((id) => id !== element.id),
          ];
          return {
            elements: orderedElementIds.flatMap((id) => {
              const orig = elementOrigins.get(id);
              if (!orig) return [];
              return [{ id, x: orig.x + worldDx, y: orig.y + worldDy }];
            }),
            swimlanes: Array.from(swimlaneOrigins.entries()).map(([id, orig]) => ({
              id,
              x: orig.x + worldDx,
              y: orig.y + worldDy,
            })),
            boundedContexts: Array.from(bcOrigins.entries()).map(([id, orig]) => ({
              id,
              x: orig.x + worldDx,
              y: orig.y + worldDy,
            })),
          };
        };

        const onMoveEv = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (
            isTouch &&
            longPressTimer &&
            Math.hypot(dx, dy) >= LONG_PRESS_MOVE_CANCEL_PX
          ) {
            cancelLongPress();
          }
          if (longPressTriggered) return;
          if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            draggedRef.current = true;
          }
          if (relationMode && !draggedRef.current) return;
          const overClip = isPointerOverClipboardDrop(ev.clientX, ev.clientY);
          useStormBoardStore.getState().setClipboardDropHighlight(overClip);
          if (overClip) {
            // Park selection at origin while hovering the clipboard drop zone.
            onMoveMany(buildUpdates(0, 0));
            return;
          }
          onMoveMany(buildUpdates(dx / zoom, dy / zoom));
        };

        const onUp = (ev: PointerEvent) => {
          window.removeEventListener("pointermove", onMoveEv);
          window.removeEventListener("pointerup", onUp);
          cancelLongPress();
          if (longPressTriggered) {
            useStormBoardStore.getState().endGesture();
            return;
          }
          useStormBoardStore.getState().endGesture();
          useStormBoardStore.getState().setClipboardDropHighlight(false);

          if (draggedRef.current && isPointerOverClipboardDrop(ev.clientX, ev.clientY)) {
            // Restore pre-drag positions, then cut into clipboard.
            onMoveMany(buildUpdates(0, 0));
            useStormBoardStore.getState().moveToClipboard({
              elementIds: moveSet.elementIds,
              swimlaneIds: moveSet.swimlaneIds,
              boundedContextIds: moveSet.boundedContextIds,
            });
            return;
          }

          if (draggedRef.current) return;

          if (isRelationTargetHint) {
            onCompleteConnect(element.id);
            return;
          }

          if (relationMode) {
            handleConnect();
            return;
          }

          onSelect(element.id, e.shiftKey);
        };

        window.addEventListener("pointermove", onMoveEv);
        window.addEventListener("pointerup", onUp);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (relationMode) return;
        onSelect(element.id, false);
        if (isLink && linkReady) {
          const result = activateBoardLink(element);
          if (!result.ok) window.alert(result.reason);
          return;
        }
        beginEdit();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openElementContextMenu(e.clientX, e.clientY);
      }}
    >
      <div
        className={[
          "relative flex h-full w-full border px-2 py-1 shadow-sm transition-shadow",
          isLink && !editing
            ? "flex-row items-center gap-2 overflow-hidden"
            : showDetails || noteLike || isBoundary || (isLink && editing)
              ? "flex-col items-stretch justify-start gap-0.5 overflow-x-hidden overflow-y-auto"
              : "flex-col items-center justify-center",
          shapeClass,
          selected || editing ? "ring-2 ring-[var(--accent)]" : "",
          connecting ? "ring-2 ring-[var(--accent-2)] shadow-md" : "",
          searchEmphasize && !selected && !editing && !connecting
            ? "ring-2 ring-[var(--accent-2)] shadow-md"
            : "",
          isRelationTargetHint ? "ring-2 ring-[var(--accent-2)]/50" : "",
          relationMode && !connecting ? "cursor-crosshair" : "",
          !inActiveMode && !dimmed
            ? "opacity-70 outline outline-1 outline-dashed outline-[var(--muted)]"
            : "",
          !inActiveMode && dimmed ? "outline outline-1 outline-dashed outline-[var(--muted)]" : "",
          isBoundary ? "border-2" : "",
          isLink && linkReady ? "hover:shadow-md" : "",
        ].join(" ")}
        style={{
          backgroundColor: isBoundary
            ? hexToRgba(colors.bg, BOUNDARY_FILL_OPACITY)
            : colors.bg,
          borderColor: colors.border,
          color: colors.text,
          borderStyle: isNote || isWhitebox || (isLink && !linkReady) ? "dashed" : undefined,
          borderLeftWidth: isInstruction ? 4 : undefined,
        }}
        title={
          dimForSearch
            ? "Kein Suchtreffer"
            : dimForFocus
              ? `Fokus: ${ELEMENT_STYLES[paletteType].label} — anderes Element abgedunkelt`
              : !inActiveMode
                ? "Element aus dem anderen Methoden-Modus"
                : isLink
                  ? linkReady
                    ? linkKind === "view"
                      ? `Doppelklick öffnet Sicht${linkPreview ? `: ${linkPreview}` : ""}`
                      : `Doppelklick öffnet Link${linkPreview ? `: ${linkPreview}` : ""}`
                    : "Ziel in der Detailleiste setzen"
                  : isAggregate
                  ? "Aggregate Root — Entity & Value Objects hineinziehen"
                  : isSubdomain
                    ? "Subdomain — Problemraum-Bereich; Elemente hineinziehen"
                    : isWhitebox
                      ? "Whitebox — geöffneter Scope nach Zoom-in (C4-Grenze)"
                      : isInstruction
                        ? "Instruction — Anweisung für die Umsetzung"
                        : supportsArchDrilldown(element.type)
                          ? "Detail-Sicht: Zoom in (C4 / Blackbox→Whitebox)"
                          : undefined
        }
      >
        {isLink && !editing ? (
          <>
            <button
              type="button"
              title={linkReady ? "Link öffnen" : "Kein Ziel gesetzt"}
              aria-label={linkReady ? "Link öffnen" : "Kein Ziel gesetzt"}
              disabled={!linkReady}
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-current/20",
                linkReady
                  ? "bg-white/75 opacity-90 hover:opacity-100"
                  : "cursor-default bg-white/40 opacity-50",
              ].join(" ")}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!linkReady) return;
                const result = activateBoardLink(element);
                if (!result.ok) window.alert(result.reason);
              }}
            >
              {linkKind === "view" ? (
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            <div className="min-w-0 flex-1 text-left">
              {searchActive && searchHit?.inLabel ? (
                <HighlightedText
                  text={element.label}
                  query={searchQuery}
                  className="block truncate text-xs font-semibold leading-tight"
                />
              ) : (
                <span className="block truncate text-xs font-semibold leading-tight">
                  {element.label}
                </span>
              )}
              <span
                className={[
                  "mt-0.5 block truncate text-[0.62rem] leading-tight",
                  linkPreview ? "opacity-75" : "italic opacity-50",
                ].join(" ")}
              >
                {linkPreview ?? (linkKind === "view" ? "Sicht wählen…" : "URL setzen…")}
              </span>
            </div>
          </>
        ) : (
          <>
        {(isInstruction || isBoundary || showArchTypeBadge) && (
          <span
            className="mb-0.5 w-fit shrink-0 rounded px-1 py-px text-[0.58rem] font-bold uppercase tracking-wide"
            style={{ backgroundColor: colors.border, color: colors.text }}
          >
            {isAggregate
              ? "Aggregate Root"
              : isSubdomain
                ? `Subdomain · ${SUBDOMAIN_KIND_LABEL[element.metadata?.subdomainKind ?? "core"] ?? "Core"}`
                : isInstruction
                  ? "Instruction"
                  : style.shortLabel}
          </span>
        )}
        {editing ? (
          noteLike ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              className={editorClass}
              value={draft}
              rows={4}
              aria-label="Titel bearbeiten"
              onChange={(e) => setDraftValue(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={() => commitLabel(draftRef.current)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commitLabel(draftRef.current);
                }
              }}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              className={editorClass}
              value={draft}
              aria-label="Titel bearbeiten"
              onChange={(e) => setDraftValue(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={() => commitLabel(draftRef.current)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  commitLabel(draftRef.current);
                }
              }}
            />
          )
        ) : searchActive && searchHit?.inLabel ? (
          <HighlightedText
            text={element.label}
            query={searchQuery}
            className={[labelClass, isBoundary ? "border-b border-current/20 pb-1" : ""].join(" ")}
          />
        ) : (
          <span
            className={[labelClass, isBoundary ? "border-b border-current/20 pb-1" : ""].join(" ")}
          >
            {element.label}
          </span>
        )}
        {!editing && showDescription && (
          <p className="w-full whitespace-pre-wrap break-words text-left text-[0.65rem] leading-snug opacity-80">
            {searchActive && searchHit?.inDescription ? (
              <HighlightedText text={element.description!} query={searchQuery} />
            ) : (
              element.description
            )}
          </p>
        )}
        {!editing && attrLines.length > 0 && (
          <ul className="w-full min-w-0 list-none space-y-0.5 text-left text-[0.62rem] leading-snug opacity-85">
            {attrLines.slice(0, 8).map((line, i) => (
              <li key={`${i}-${line}`} className="whitespace-pre-wrap break-words">
                {searchActive && searchHit?.inAttributes ? (
                  <HighlightedText text={line} query={searchQuery} />
                ) : (
                  line
                )}
              </li>
            ))}
            {attrLines.length > 8 && (
              <li className="opacity-60">+{attrLines.length - 8} weitere</li>
            )}
          </ul>
        )}
        {!editing && methodLines.length > 0 && (
          <ul className="w-full min-w-0 list-none space-y-0.5 border-t border-current/15 pt-0.5 text-left text-[0.62rem] leading-snug opacity-85">
            {methodLines.slice(0, 8).map((line, i) => (
              <li key={`${i}-${line}`} className="whitespace-pre-wrap break-words font-medium">
                {searchActive && searchHit?.inMethods ? (
                  <HighlightedText text={line} query={searchQuery} />
                ) : (
                  line
                )}
              </li>
            ))}
            {methodLines.length > 8 && (
              <li className="opacity-60">+{methodLines.length - 8} weitere</li>
            )}
          </ul>
        )}
          </>
        )}
        {element.metadata?.isRecurring && !editing && (
          <Clock className="absolute bottom-1 left-1 h-3 w-3 opacity-70" aria-hidden />
        )}
        {element.type === "hotspot" && element.metadata?.hotspotStatus === "resolved" && !editing && (
          <RotateCcw className="absolute bottom-1 right-1 h-3 w-3 opacity-70" aria-hidden />
        )}
        {supportsArchDrilldown(element.type) && !editing && (
          <button
            type="button"
            title={
              archNav?.direction === "up"
                ? `Übersicht öffnen (${archNav.targetViewName})`
                : archNav?.direction === "down"
                  ? `Detail-Sicht öffnen (${archNav.targetViewName})`
                  : "Detail-Sicht erstellen"
            }
            aria-label={
              archNav?.direction === "up"
                ? `Übersicht öffnen (${archNav.targetViewName})`
                : archNav?.direction === "down"
                  ? `Detail-Sicht öffnen (${archNav.targetViewName})`
                  : "Detail-Sicht erstellen"
            }
            className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-current/25 bg-white/80 text-current opacity-80 hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (archNav) {
                navigateBuildingBlockViewLink(element.id);
              } else {
                openBuildingBlockView(element.id);
              }
            }}
          >
            <LayoutDashboard className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>

      {selected &&
        !editing &&
        (Object.keys(HANDLE_POSITIONS) as ResizeHandle[]).map((handle) => (
          <button
            key={handle}
            type="button"
            aria-label={`Größe ändern (${handle})`}
            className={[
              "absolute z-20 rounded-sm border border-sky-600 bg-white shadow-sm",
              isCoarsePointer ? "h-4 w-4" : "h-2.5 w-2.5",
              HANDLE_POSITIONS[handle],
            ].join(" ")}
            onPointerDown={(e) => startResize(handle, e)}
          />
        ))}

      {selected && !editing && (
        <button
          type="button"
          aria-label="Drehen"
          title="Drehen (Shift: 15°-Raster)"
          className="absolute left-1/2 top-0 z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-[1.65rem] cursor-grab items-center justify-center rounded-full border border-sky-600 bg-white text-sky-700 shadow-sm active:cursor-grabbing"
          onPointerDown={startRotate}
        >
          <RotateCw className="h-3 w-3" aria-hidden />
        </button>
      )}

      {!editing && (
        <button
          type="button"
          className={[
            "absolute right-1.5 top-1.5 z-30 flex items-center justify-center rounded-full border shadow-sm transition-[opacity,colors]",
            isCoarsePointer ? "h-7 w-7" : "h-5 w-5",
            selected || connecting || relationMode || isRelationTargetHint
              ? "opacity-100"
              : "opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
            connecting
              ? "border-[var(--accent-2)] bg-[#1e3a36] text-[var(--accent-2)] hover:bg-[#244840]"
              : isRelationTargetHint
                ? "border-[var(--accent-2)]/60 bg-[var(--control)] text-[var(--accent-2)]"
                : "border-[var(--border)] bg-[var(--panel-solid)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
          ].join(" ")}
          title={connecting ? "Als Ziel wählen (Abbrechen: erneut klicken)" : "Relation starten"}
          aria-label={connecting ? "Als Ziel wählen" : "Relation starten"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleConnect();
          }}
        >
          <ArrowRight className="h-3 w-3" aria-hidden />
        </button>
      )}

      {selected && !editing && (
        <button
          type="button"
          className={[
            "absolute bottom-1.5 right-1.5 z-30 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-solid)] text-[var(--muted)] shadow-sm transition-[opacity,colors] hover:border-[var(--accent)] hover:text-[var(--accent)]",
            isCoarsePointer ? "h-7 w-7" : "h-5 w-5",
          ].join(" ")}
          title="Aktionen"
          aria-label="Kontextmenü öffnen"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            openElementContextMenu(rect.left + rect.width / 2, rect.bottom + 4);
          }}
        >
          <MoreVertical className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
