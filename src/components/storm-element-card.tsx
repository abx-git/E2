"use client";

import { useRef } from "react";
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

// Post-it Pastell: helle Hintergründe, etwas dunklere Ränder für Lesbarkeit.
const EVENT_STORMING_COLORS: Record<StormElement["type"], { bg: string; border: string; text: string }> = {
  domainEvent: { bg: "#ffedd5", border: "#fb923c", text: "#7c2d12" },
  command: { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  actor: { bg: "#fef9c3", border: "#f59e0b", text: "#713f12" },
  aggregate: { bg: "#fef08a", border: "#eab308", text: "#713f12" },
  policy: { bg: "#f5d0fe", border: "#c084fc", text: "#6b21a8" },
  readModel: { bg: "#dcfce7", border: "#22c55e", text: "#064e3b" },
  externalSystem: { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
  ui: { bg: "#f1f5f9", border: "#94a3b8", text: "#0f172a" },
  hotspot: { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" },
  pivotalEvent: { bg: "#fef3c7", border: "#f59e0b", text: "#7c2d12" },
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
  onEdit: (id: string) => void;
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
  onEdit,
}: StormElementCardProps) {
  const style = ELEMENT_STYLES[element.type];
  const w = element.width ?? style.defaultWidth;
  const h = element.height ?? style.defaultHeight;
  const rotation = element.rotation ?? style.rotation ?? 0;
  const draggedRef = useRef(false);
  const colors = EVENT_STORMING_COLORS[element.type];

  const shapeClass =
    style.shape === "pill"
      ? "rounded-full"
      : style.shape === "wide"
        ? "rounded-md"
        : style.shape === "rectangle"
          ? "rounded-sm"
          : "rounded-lg";

  const handleConnect = () => {
    if (connecting) onCompleteConnect(element.id);
    else onStartConnect(element.id);
  };

  const startResize = (handle: ResizeHandle, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

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
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className="absolute select-none"
      style={{
        left: element.x,
        top: element.y,
        width: w,
        height: h,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        zIndex: selected || connecting ? 30 : 20,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        draggedRef.current = false;

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
        onEdit(element.id);
      }}
    >
      <div
        className={[
          "relative flex h-full w-full flex-col items-center justify-center border px-2 py-1 shadow-sm transition-shadow",
          shapeClass,
          selected ? "ring-2 ring-sky-500" : "",
          connecting ? "ring-2 ring-purple-600 shadow-md" : "",
          isRelationTargetHint ? "ring-2 ring-purple-300" : "",
          relationMode && !connecting ? "cursor-crosshair" : "",
        ].join(" ")}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        <span className="line-clamp-3 text-center text-xs font-semibold leading-tight">
          {element.label}
        </span>
        {element.metadata?.isRecurring && (
          <Clock className="absolute right-1 top-1 h-3 w-3 opacity-70" aria-hidden />
        )}
        {element.type === "hotspot" && element.metadata?.hotspotStatus === "resolved" && (
          <RotateCcw className="absolute left-1 top-1 h-3 w-3 opacity-70" aria-hidden />
        )}
      </div>

      {selected &&
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

      {(!selected || relationMode || connecting || isRelationTargetHint) && (
        <button
          type="button"
          className={[
            "absolute -right-2.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors",
            connecting
              ? "border-purple-500 bg-purple-100 text-purple-800 hover:bg-purple-200"
              : isRelationTargetHint
                ? "border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "border-slate-400 bg-white text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700",
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
