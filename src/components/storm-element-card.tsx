"use client";

import { useRef } from "react";
import { ArrowRight, Clock, RotateCcw } from "lucide-react";

import { ELEMENT_STYLES } from "@/lib/element-styles";
import type { StormElement } from "@/types/storm-element";

const DRAG_THRESHOLD_PX = 6;
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
  connecting: boolean;
  isRelationTargetHint: boolean;
  relationMode: boolean;
  zoom: number;
  onSelect: (id: string, additive: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onStartConnect: (id: string) => void;
  onCompleteConnect: (id: string) => void;
  onEdit: (id: string) => void;
}

export function StormElementCard({
  element,
  selected,
  connecting,
  isRelationTargetHint,
  relationMode,
  zoom,
  onSelect,
  onMove,
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
        const origX = element.x;
        const origY = element.y;

        const onMoveEv = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            draggedRef.current = true;
          }
          if (relationMode && !draggedRef.current) return;
          onMove(element.id, origX + dx / zoom, origY + dy / zoom);
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
    </div>
  );
}
