"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, Pencil, Plus, Trash2, X } from "lucide-react";

import type { CustomCardType } from "@/lib/custom-card-types";
import {
  CUSTOM_CARD_COLOR_PRESETS,
  colorsFromPreset,
  stereotypeLabel,
} from "@/lib/custom-card-types";
import type { ElementType } from "@/types/storm-element";
import { partitionPaletteTypes } from "@/types/storm-element";
import {
  ELEMENT_STYLES,
  elementDimensions,
  styleForCustomCardType,
} from "@/lib/element-styles";
import { getAllowedTypesForPhase } from "@/lib/facilitator-phases";
import { isPointerOverStormCanvas } from "@/lib/board-clipboard";
import { screenToWorld, snapToGrid, snapToTimeline } from "@/lib/canvas-viewport";
import { useStormBoardStore } from "@/store/storm-board-store";
import { MODELING_MODE_LABELS } from "@/types/storm-element";

const DRAG_THRESHOLD_PX = 5;

export interface ElementPaletteProps {
  onSelectType: (type: ElementType) => void;
  onRequestHelp?: (type: ElementType) => void;
}

type GhostState =
  | {
      kind: "fixed";
      type: ElementType;
      x: number;
      y: number;
      overCanvas: boolean;
    }
  | {
      kind: "custom";
      customType: CustomCardType;
      x: number;
      y: number;
      overCanvas: boolean;
    };

function commitCustomTypeName(
  id: string,
  draft: string,
  updateCustomCardType: (
    id: string,
    patch: Partial<Pick<CustomCardType, "name" | "fill" | "stroke" | "ink">>,
  ) => void,
): string {
  const name = draft.trim() || "Typ";
  updateCustomCardType(id, { name });
  return name;
}

function CustomCardTypeEditDialog({
  customType,
  onClose,
}: {
  customType: CustomCardType;
  onClose: () => void;
}) {
  const updateCustomCardType = useStormBoardStore((s) => s.updateCustomCardType);
  const deleteCustomCardType = useStormBoardStore((s) => s.deleteCustomCardType);
  const liveType =
    useStormBoardStore((s) => s.customCardTypes.find((t) => t.id === customType.id)) ??
    customType;

  const [nameDraft, setNameDraft] = useState(customType.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      commitCustomTypeName(liveType.id, nameDraft, updateCustomCardType);
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [liveType.id, nameDraft, onClose, updateCustomCardType]);

  const finish = () => {
    commitCustomTypeName(liveType.id, nameDraft, updateCustomCardType);
    onClose();
  };

  const previewName = nameDraft.trim() || "Typ";

  return createPortal(
    <div
      className="fixed inset-0 z-[1400] flex items-end justify-center bg-black/30 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Kartentyp bearbeiten"
      // pointerdown on backdrop only — click after text-select drag must not close
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] p-4 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Kartentyp</h3>
            <p className="mt-0.5 text-[0.7rem] text-[var(--muted)]">
              Name und Farbe gelten für alle Karten dieses Typs.
            </p>
          </div>
          <button
            type="button"
            className="dock-control rounded-md p-1.5"
            aria-label="Schließen"
            onClick={finish}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-3 flex flex-col gap-1 text-xs text-[var(--text)]">
          <span className="text-[var(--muted)]">Name</span>
          <input
            ref={inputRef}
            className="dock-field"
            value={nameDraft}
            maxLength={64}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const name = commitCustomTypeName(liveType.id, nameDraft, updateCustomCardType);
              setNameDraft(name);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                finish();
              }
            }}
            placeholder="z. B. Interface"
          />
          <span className="text-[0.65rem] text-[var(--muted)]">
            Vorschau: {stereotypeLabel(previewName)}
          </span>
        </label>

        <p className="mb-1.5 text-[0.7rem] font-medium text-[var(--muted)]">Farbe</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {CUSTOM_CARD_COLOR_PRESETS.map((preset) => {
            const active = liveType.fill === preset.fill;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={active}
                className={[
                  "h-7 w-7 rounded-md border-2 shadow-sm transition-transform",
                  active
                    ? "scale-110 border-[var(--accent)]"
                    : "border-transparent hover:scale-105",
                ].join(" ")}
                style={{
                  backgroundColor: preset.fill,
                  boxShadow: `inset 0 0 0 1px ${preset.stroke}`,
                }}
                onClick={() => updateCustomCardType(liveType.id, colorsFromPreset(preset))}
              />
            );
          })}
        </div>

        <div
          className="mb-4 rounded-lg border px-3 py-2"
          style={{
            backgroundColor: liveType.fill,
            borderColor: liveType.stroke,
            color: liveType.ink,
          }}
        >
          <span className="block text-[0.58rem] font-bold uppercase tracking-wide opacity-80">
            {stereotypeLabel(previewName)}
          </span>
          <span className="text-sm font-medium">Beispielkarte</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="dock-control flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-700"
            onClick={() => {
              if (
                window.confirm(
                  `Typ „${previewName}“ löschen? Vorhandene Karten behalten den Verweis, verlieren aber die Typfarbe.`,
                )
              ) {
                deleteCustomCardType(liveType.id);
                onClose();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Löschen
          </button>
          <button
            type="button"
            className="dock-control rounded-lg px-3 py-1.5 text-xs font-medium"
            onClick={finish}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
export function ElementPalette({ onSelectType, onRequestHelp }: ElementPaletteProps) {
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const setPaletteType = useStormBoardStore((s) => s.setPaletteType);
  const paletteCustomTypeId = useStormBoardStore((s) => s.paletteCustomTypeId);
  const setPaletteCustomTypeId = useStormBoardStore((s) => s.setPaletteCustomTypeId);
  const addElement = useStormBoardStore((s) => s.addElement);
  const modelingMode = useStormBoardStore((s) => s.modelingMode);
  const workshopFormat = useStormBoardStore((s) => s.workshopFormat);
  const facilitatorEnabled = useStormBoardStore((s) => s.facilitatorEnabled);
  const facilitatorPhase = useStormBoardStore((s) => s.facilitatorPhase);
  const customCardTypes = useStormBoardStore((s) => s.customCardTypes);
  const addCustomCardType = useStormBoardStore((s) => s.addCustomCardType);

  const [ghost, setGhost] = useState<GhostState | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const dragRef = useRef<{
    kind: "fixed" | "custom";
    type: ElementType;
    customTypeId?: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const isFreeform = modelingMode === "freeform";
  const allowed = getAllowedTypesForPhase(
    modelingMode,
    workshopFormat,
    facilitatorPhase,
    facilitatorEnabled,
  );
  const { modeling, annotations } = partitionPaletteTypes(allowed);
  const fixedModeling = modeling.filter((t) => t !== "customCard");
  const modeLabel = MODELING_MODE_LABELS[modelingMode];
  const editingType = editingTypeId
    ? customCardTypes.find((t) => t.id === editingTypeId) ?? null
    : null;

  const dropFixedOnCanvas = (type: ElementType, clientX: number, clientY: number) => {
    const canvas = document.querySelector<HTMLElement>("[data-storm-canvas]");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;

    const store = useStormBoardStore.getState();
    const world = screenToWorld(store.viewport, clientX, clientY, rect);
    const dims = elementDimensions(type);
    let x = world.x - dims.width / 2;
    let y = world.y - dims.height / 2;

    if (store.snapToGrid) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }
    if (store.snapToTimeline) {
      y = snapToTimeline(y, store.timeline.y);
    }

    setPaletteType(type);
    onSelectType(type);
    addElement(type, x, y);
  };

  const dropCustomOnCanvas = (customType: CustomCardType, clientX: number, clientY: number) => {
    const canvas = document.querySelector<HTMLElement>("[data-storm-canvas]");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;

    const store = useStormBoardStore.getState();
    const world = screenToWorld(store.viewport, clientX, clientY, rect);
    const dims = elementDimensions("customCard");
    let x = world.x - dims.width / 2;
    let y = world.y - dims.height / 2;

    if (store.snapToGrid) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }
    if (store.snapToTimeline) {
      y = snapToTimeline(y, store.timeline.y);
    }

    setPaletteType("customCard");
    setPaletteCustomTypeId(customType.id);
    onSelectType("customCard");
    addElement("customCard", x, y, undefined, { customTypeId: customType.id });
  };

  const beginFixedDrag = (type: ElementType, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    dragRef.current = { kind: "fixed", type, startX, startY, active: false };

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.kind !== "fixed" || drag.type !== type) return;
      const dist = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY);
      if (!drag.active && dist < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setGhost({
        kind: "fixed",
        type,
        x: ev.clientX,
        y: ev.clientY,
        overCanvas: isPointerOverStormCanvas(ev.clientX, ev.clientY),
      });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      setGhost(null);

      if (!drag || drag.kind !== "fixed") return;

      if (!drag.active) {
        setPaletteType(type);
        onSelectType(type);
        return;
      }

      if (!isPointerOverStormCanvas(ev.clientX, ev.clientY)) return;
      dropFixedOnCanvas(type, ev.clientX, ev.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const beginCustomDrag = (customType: CustomCardType, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    dragRef.current = {
      kind: "custom",
      type: "customCard",
      customTypeId: customType.id,
      startX,
      startY,
      active: false,
    };

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.kind !== "custom" || drag.customTypeId !== customType.id) return;
      const dist = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY);
      if (!drag.active && dist < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setGhost({
        kind: "custom",
        customType,
        x: ev.clientX,
        y: ev.clientY,
        overCanvas: isPointerOverStormCanvas(ev.clientX, ev.clientY),
      });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      setGhost(null);

      if (!drag || drag.kind !== "custom") return;

      if (!drag.active) {
        setPaletteType("customCard");
        setPaletteCustomTypeId(customType.id);
        onSelectType("customCard");
        return;
      }

      if (!isPointerOverStormCanvas(ev.clientX, ev.clientY)) return;
      dropCustomOnCanvas(customType, ev.clientX, ev.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const renderTypeRow = (type: ElementType, compact = false) => {
    const style = ELEMENT_STYLES[type];
    const active = paletteType === type;
    return (
      <div key={type} className="flex items-center gap-1.5">
        <button
          type="button"
          onPointerDown={(e) => beginFixedDrag(type, e)}
          className={[
            "flex-1 cursor-grab border text-left font-medium transition active:cursor-grabbing",
            compact ? "rounded-md px-2 py-1.5 text-[0.7rem]" : "rounded-lg px-2 py-2 text-xs",
            active
              ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel-solid)]"
              : "opacity-80 hover:opacity-100",
          ].join(" ")}
          style={{
            backgroundColor: style.fill,
            borderColor: style.stroke,
            color: style.ink,
          }}
          title={`${style.label} — auf die Karte ziehen`}
        >
          {style.label}
        </button>
        <button
          type="button"
          className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          title="Hilfe zu diesem Element"
          aria-label={`Hilfe für ${type}`}
          onClick={(e) => {
            e.stopPropagation();
            onRequestHelp?.(type);
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  const renderCustomTypeRow = (customType: CustomCardType) => {
    const style = styleForCustomCardType(customType);
    const active = paletteType === "customCard" && paletteCustomTypeId === customType.id;
    return (
      <div key={customType.id} className="flex items-center gap-1">
        <button
          type="button"
          onPointerDown={(e) => beginCustomDrag(customType, e)}
          className={[
            "flex min-w-0 flex-1 cursor-grab flex-col border text-left transition active:cursor-grabbing",
            "rounded-lg px-2 py-1.5",
            active
              ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel-solid)]"
              : "opacity-80 hover:opacity-100",
          ].join(" ")}
          style={{
            backgroundColor: style.fill,
            borderColor: style.stroke,
            color: style.ink,
          }}
          title={`${stereotypeLabel(customType.name)} — auf die Karte ziehen`}
        >
          <span className="truncate text-[0.58rem] font-bold uppercase tracking-wide opacity-80">
            {stereotypeLabel(customType.name)}
          </span>
          <span className="truncate text-xs font-medium">
            {customType.name.trim() || "Typ"}
          </span>
        </button>
        <button
          type="button"
          className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          title="Typ bearbeiten"
          aria-label={`${customType.name} bearbeiten`}
          onClick={(e) => {
            e.stopPropagation();
            setEditingTypeId(customType.id);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  const ghostStyle =
    ghost?.kind === "fixed"
      ? ELEMENT_STYLES[ghost.type]
      : ghost?.kind === "custom"
        ? styleForCustomCardType(ghost.customType)
        : null;
  const ghostLabel =
    ghost?.kind === "fixed"
      ? ELEMENT_STYLES[ghost.type].label
      : ghost?.kind === "custom"
        ? stereotypeLabel(ghost.customType.name)
        : "";

  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel-solid)]">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <h2 className="group-label">Elemente</h2>
        <p className="mt-1 text-[0.65rem] leading-snug text-[var(--muted)]">
          {modeLabel} · auf die Karte ziehen
        </p>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">
        {isFreeform ? (
          <>
            <p className="px-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Kartentypen
            </p>
            {customCardTypes.map((t) => renderCustomTypeRow(t))}
            <button
              type="button"
              className="dock-control mt-0.5 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium"
              onClick={() => {
                const id = addCustomCardType();
                setEditingTypeId(id);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Typ hinzufügen
            </button>
            {customCardTypes.length === 0 && (
              <p className="px-0.5 text-[0.65rem] leading-snug text-[var(--muted)]">
                Lege Typen an (z.&nbsp;B. Interface, Class) — sie erscheinen hier und farbig auf den
                Karten.
              </p>
            )}
          </>
        ) : (
          fixedModeling.map((type) => renderTypeRow(type))
        )}

        {annotations.length > 0 && (
          <div className="mt-2 border-t border-dashed border-[var(--border)] pt-2">
            <p className="mb-1.5 px-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Annotationen
            </p>
            <div className="flex flex-col gap-1">
              {annotations.map((type) => renderTypeRow(type, true))}
            </div>
          </div>
        )}
      </div>

      {editingType && typeof document !== "undefined" && (
        <CustomCardTypeEditDialog
          customType={editingType}
          onClose={() => setEditingTypeId(null)}
        />
      )}

      {ghost &&
        ghostStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[1300] max-w-[10rem] truncate rounded-md border px-2 py-1.5 text-xs font-medium shadow-lg"
            style={{
              left: ghost.x + 12,
              top: ghost.y + 12,
              backgroundColor: ghostStyle.fill,
              color: ghostStyle.ink,
              borderColor: ghostStyle.stroke,
              opacity: ghost.overCanvas ? 1 : 0.55,
              width: Math.min(ghostStyle.defaultWidth, 160),
            }}
          >
            {ghostLabel}
          </div>,
          document.body,
        )}
    </aside>
  );
}
