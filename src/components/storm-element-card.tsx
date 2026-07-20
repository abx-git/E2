"use client";

import { Clock, RotateCcw } from "lucide-react";

import { ELEMENT_STYLES } from "@/lib/element-styles";
import type { StormElement } from "@/types/storm-element";

export interface StormElementCardProps {
  element: StormElement;
  selected: boolean;
  connecting: boolean;
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

  const shapeClass =
    style.shape === "pill"
      ? "rounded-full"
      : style.shape === "wide"
        ? "rounded-md"
        : style.shape === "rectangle"
          ? "rounded-sm"
          : "rounded-lg";

  return (
    <div
      className="absolute select-none"
      style={{
        left: element.x,
        top: element.y,
        width: w,
        height: h,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        zIndex: selected ? 30 : 20,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onSelect(element.id, e.shiftKey);

        const startX = e.clientX;
        const startY = e.clientY;
        const origX = element.x;
        const origY = element.y;

        const onMoveEv = (ev: PointerEvent) => {
          const dx = (ev.clientX - startX) / zoom;
          const dy = (ev.clientY - startY) / zoom;
          onMove(element.id, origX + dx, origY + dy);
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMoveEv);
          window.removeEventListener("pointerup", onUp);
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
          "relative flex h-full w-full flex-col items-center justify-center border px-2 py-1 shadow-sm",
          style.bg,
          style.border,
          style.text,
          shapeClass,
          selected ? "ring-2 ring-sky-500" : "",
          connecting ? "ring-2 ring-purple-500" : "",
        ].join(" ")}
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
        className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-slate-400 bg-white text-[8px] leading-none hover:bg-sky-100"
        title="Relation erstellen"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (connecting) onCompleteConnect(element.id);
          else onStartConnect(element.id);
        }}
      >
        →
      </button>
    </div>
  );
}
