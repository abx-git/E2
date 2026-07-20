"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock, RotateCcw } from "lucide-react";

import { ELEMENT_STYLES } from "@/lib/element-styles";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { StormElement } from "@/types/storm-element";

const DRAG_THRESHOLD_PX = 6;
const MIN_SIZE = 40;

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
  onMoveMany: (updates: Array<{ id: string; x: number; y: number }>) => void;
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
  const rotation = element.rotation ?? style.rotation ?? 0;
  const draggedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const draftRef = useRef(element.label);
  const editingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(element.label);
  const isNote = element.type === "note";
  const colors = {
    bg: style.fill,
    border: style.stroke,
    text: style.ink,
  };

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

  const labelClass = [
    "text-xs font-semibold leading-tight",
    isNote ? "line-clamp-6 w-full whitespace-pre-wrap text-left" : "line-clamp-3 text-center",
  ].join(" ");

  const editorClass = [
    "w-full resize-none bg-transparent text-xs font-semibold leading-tight outline-none ring-0",
    isNote ? "h-full whitespace-pre-wrap text-left" : "text-center",
  ].join(" ");

  return (
    <div
      className="absolute select-none"
      style={{
        left: element.x,
        top: element.y,
        width: w,
        height: h,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        zIndex: selected || connecting || editing ? 30 : 20,
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

        const moveIds =
          selected && selectedIds.includes(element.id) && selectedIds.length > 1
            ? selectedIds
            : [element.id];
        const boardElements = useStormBoardStore.getState().elements;
        const origins = new Map(
          boardElements
            .filter((el) => moveIds.includes(el.id))
            .map((el) => [el.id, { x: el.x, y: el.y }] as const),
        );

        const onMoveEv = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            draggedRef.current = true;
          }
          if (relationMode && !draggedRef.current) return;
          const worldDx = dx / zoom;
          const worldDy = dy / zoom;
          const orderedIds = [
            element.id,
            ...moveIds.filter((id) => id !== element.id),
          ];
          onMoveMany(
            orderedIds.flatMap((id) => {
              const orig = origins.get(id);
              if (!orig) return [];
              return [{ id, x: orig.x + worldDx, y: orig.y + worldDy }];
            }),
          );
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMoveEv);
          window.removeEventListener("pointerup", onUp);
          useStormBoardStore.getState().endGesture();

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
        beginEdit();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (editing) commitLabel(draftRef.current);
        const store = useStormBoardStore.getState();
        if (!store.selectedElementIds.includes(element.id)) {
          store.selectElement(element.id);
        }
        const ids = store.selectedElementIds.includes(element.id)
          ? store.selectedElementIds
          : [element.id];
        store.openContextMenu(
          e.clientX,
          e.clientY,
          ids.length > 1 ? { kind: "elements", ids } : { kind: "element", id: element.id },
        );
      }}
    >
      <div
        className={[
          "relative flex h-full w-full flex-col items-center justify-center border px-2 py-1 shadow-sm transition-shadow",
          shapeClass,
          selected || editing ? "ring-2 ring-[var(--accent)]" : "",
          connecting ? "ring-2 ring-[var(--accent-2)] shadow-md" : "",
          isRelationTargetHint ? "ring-2 ring-[var(--accent-2)]/50" : "",
          relationMode && !connecting ? "cursor-crosshair" : "",
        ].join(" ")}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
          borderStyle: isNote ? "dashed" : undefined,
        }}
      >
        {editing ? (
          isNote ? (
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
        ) : (
          <span className={labelClass}>{element.label}</span>
        )}
        {element.metadata?.isRecurring && !editing && (
          <Clock className="absolute right-1 top-1 h-3 w-3 opacity-70" aria-hidden />
        )}
        {element.type === "hotspot" && element.metadata?.hotspotStatus === "resolved" && !editing && (
          <RotateCcw className="absolute left-1 top-1 h-3 w-3 opacity-70" aria-hidden />
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
              "absolute z-20 h-2.5 w-2.5 rounded-sm border border-sky-600 bg-white shadow-sm",
              HANDLE_POSITIONS[handle],
            ].join(" ")}
            onPointerDown={(e) => startResize(handle, e)}
          />
        ))}

      {!editing && (!selected || relationMode || connecting || isRelationTargetHint) && (
        <button
          type="button"
          className={[
            "absolute -right-2.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors",
          connecting
            ? "border-[var(--accent-2)] bg-[#1e3a36] text-[var(--accent-2)] hover:bg-[#244840]"
            : isRelationTargetHint
              ? "border-[var(--accent-2)]/60 bg-[var(--control)] text-[var(--accent-2)]"
              : "border-[var(--border)] bg-[var(--panel-solid)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
          ].join(" ")}
          title={connecting ? "Als Ziel wählen (Abbrechen: erneut klicken)" : "Relation starten"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleConnect();
          }}
        >
          <ArrowRight className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
