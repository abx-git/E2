"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  ClipboardList,
  ClipboardPaste,
  HelpCircle,
  Link2,
  StretchHorizontal,
  StretchVertical,
  Trash2,
} from "lucide-react";

import { computeAlignPatches, type AlignMode } from "@/lib/element-align";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { NOTE_COLOR_IDS, NOTE_COLORS } from "@/lib/note-colors";
import { useStormBoardStore } from "@/store/storm-board-store";
import type { NoteColorId } from "@/types/storm-element";
import { RELATION_TYPE_LABELS, CONTEXT_MAP_PATTERN_LABELS, CONTEXT_MAP_PATTERNS, type RelationType, type ContextMapPattern } from "@/types/storm-relation";

const RELATION_TYPES = Object.keys(RELATION_TYPE_LABELS) as RelationType[];
const CONTEXT_PATTERNS = CONTEXT_MAP_PATTERNS;

const ALIGN_ROW: { mode: AlignMode; label: string; icon: typeof AlignStartHorizontal }[] = [
  { mode: "left", label: "Links", icon: AlignStartVertical },
  { mode: "centerX", label: "Mitte H", icon: AlignCenterVertical },
  { mode: "right", label: "Rechts", icon: AlignEndVertical },
  { mode: "top", label: "Oben", icon: AlignStartHorizontal },
  { mode: "centerY", label: "Mitte V", icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Unten", icon: AlignEndHorizontal },
];

export interface CanvasContextMenuProps {
  onRequestHelpElementType?: (type: string) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
  onRequestHelpContextMap?: (type: ContextMapPattern) => void;
}

export function CanvasContextMenu({
  onRequestHelpElementType,
  onRequestHelpRelationType,
  onRequestHelpContextMap,
}: CanvasContextMenuProps) {
  const menu = useStormBoardStore((s) => s.contextMenu);
  const closeContextMenu = useStormBoardStore((s) => s.closeContextMenu);
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const updateElement = useStormBoardStore((s) => s.updateElement);
  const deleteElement = useStormBoardStore((s) => s.deleteElement);
  const patchElements = useStormBoardStore((s) => s.patchElements);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const deleteRelation = useStormBoardStore((s) => s.deleteRelation);
  const updateContextRelation = useStormBoardStore((s) => s.updateContextRelation);
  const deleteContextRelation = useStormBoardStore((s) => s.deleteContextRelation);
  const setRelationMode = useStormBoardStore((s) => s.setRelationMode);
  const setRelationDraftSource = useStormBoardStore((s) => s.setRelationDraftSource);
  const setContextMapMode = useStormBoardStore((s) => s.setContextMapMode);
  const setContextMapDraftSource = useStormBoardStore((s) => s.setContextMapDraftSource);
  const deleteSwimlane = useStormBoardStore((s) => s.deleteSwimlane);
  const deleteBoundedContext = useStormBoardStore((s) => s.deleteBoundedContext);
  const clearSelection = useStormBoardStore((s) => s.clearSelection);
  const addElement = useStormBoardStore((s) => s.addElement);
  const paletteType = useStormBoardStore((s) => s.paletteType);
  const timeline = useStormBoardStore((s) => s.timeline);
  const setTimeline = useStormBoardStore((s) => s.setTimeline);
  const moveToClipboard = useStormBoardStore((s) => s.moveToClipboard);
  const pasteClipboardAt = useStormBoardStore((s) => s.pasteClipboardAt);
  const clipboard = useStormBoardStore((s) => s.clipboard);

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: Math.min(menu.x, window.innerWidth - rect.width - pad),
      top: Math.min(menu.y, window.innerHeight - rect.height - pad),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeContextMenu();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [menu, closeContextMenu]);

  if (!menu) return null;

  const run = (fn: () => void) => {
    fn();
    closeContextMenu();
  };

  const target = menu.target;
  let body: ReactNode = null;

  if (target.kind === "element") {
    const el = elements.find((e) => e.id === target.id);
    if (!el) return null;
    const style = ELEMENT_STYLES[el.type];
    body = (
      <>
        <Header title={el.label || style.label} subtitle={style.label} />
        <Item
          icon={Link2}
          label="Relation starten"
          onClick={() =>
            run(() => {
              setRelationMode(true);
              setRelationDraftSource(el.id);
            })
          }
        />
        {swimlanes.length > 0 && (
          <Submenu label="Swimlane">
            <Item
              label="Keine"
              onClick={() => run(() => updateElement(el.id, { swimlaneId: undefined }))}
            />
            {swimlanes.map((lane) => (
              <Item
                key={lane.id}
                label={lane.label}
                active={el.swimlaneId === lane.id}
                onClick={() => run(() => updateElement(el.id, { swimlaneId: lane.id }))}
              />
            ))}
          </Submenu>
        )}
        {boundedContexts.length > 0 && (
          <Submenu label="Bounded Context">
            <Item
              label="Keiner"
              onClick={() => run(() => updateElement(el.id, { boundedContextId: undefined }))}
            />
            {boundedContexts.map((bc) => (
              <Item
                key={bc.id}
                label={bc.label}
                active={el.boundedContextId === bc.id}
                onClick={() => run(() => updateElement(el.id, { boundedContextId: bc.id }))}
              />
            ))}
          </Submenu>
        )}
        {el.type === "note" && (
          <>
            <Section label="Notizfarbe" />
            {NOTE_COLOR_IDS.map((id) => (
              <Item
                key={id}
                label={NOTE_COLORS[id].label}
                active={(el.metadata?.noteColor ?? "cream") === id}
                onClick={() =>
                  run(() =>
                    updateElement(el.id, {
                      metadata: { ...el.metadata, noteColor: id as NoteColorId },
                    }),
                  )
                }
              />
            ))}
          </>
        )}
        {el.type === "hotspot" && (
          <>
            <Section label="Hotspot" />
            <Item
              label="Status: Offen"
              active={(el.metadata?.hotspotStatus ?? "open") === "open"}
              onClick={() =>
                run(() =>
                  updateElement(el.id, {
                    metadata: { ...el.metadata, hotspotStatus: "open" },
                  }),
                )
              }
            />
            <Item
              label="Status: Gelöst"
              active={el.metadata?.hotspotStatus === "resolved"}
              onClick={() =>
                run(() =>
                  updateElement(el.id, {
                    metadata: { ...el.metadata, hotspotStatus: "resolved" },
                  }),
                )
              }
            />
            {(["low", "medium", "high"] as const).map((p) => (
              <Item
                key={p}
                label={`Priorität: ${p === "low" ? "Niedrig" : p === "high" ? "Hoch" : "Mittel"}`}
                active={(el.metadata?.hotspotPriority ?? "medium") === p}
                onClick={() =>
                  run(() =>
                    updateElement(el.id, {
                      metadata: { ...el.metadata, hotspotPriority: p },
                    }),
                  )
                }
              />
            ))}
          </>
        )}
        <Item
          label={el.metadata?.isRecurring ? "Wiederkehrend aus" : "Wiederkehrend an"}
          onClick={() =>
            run(() =>
              updateElement(el.id, {
                metadata: { ...el.metadata, isRecurring: !el.metadata?.isRecurring },
              }),
            )
          }
        />
        <Submenu label="Auf Karte anzeigen">
          <Item
            label="Beschreibung"
            active={Boolean(el.metadata?.showDescriptionOnCard)}
            onClick={() =>
              run(() =>
                updateElement(el.id, {
                  metadata: {
                    ...el.metadata,
                    showDescriptionOnCard: !el.metadata?.showDescriptionOnCard,
                  },
                }),
              )
            }
          />
          <Item
            label="Attribute"
            active={Boolean(el.metadata?.showAttributesOnCard)}
            onClick={() =>
              run(() =>
                updateElement(el.id, {
                  metadata: {
                    ...el.metadata,
                    showAttributesOnCard: !el.metadata?.showAttributesOnCard,
                  },
                }),
              )
            }
          />
          <Item
            label="Methoden"
            active={Boolean(el.metadata?.showMethodsOnCard)}
            onClick={() =>
              run(() =>
                updateElement(el.id, {
                  metadata: {
                    ...el.metadata,
                    showMethodsOnCard: !el.metadata?.showMethodsOnCard,
                  },
                }),
              )
            }
          />
        </Submenu>
        <Item
          icon={HelpCircle}
          label="Hilfe"
          onClick={() => run(() => onRequestHelpElementType?.(el.type))}
        />
        <Separator />
        <Item
          icon={ClipboardList}
          label="In Zwischenablage verschieben"
          onClick={() => run(() => moveToClipboard([el.id]))}
        />
        <Item
          icon={Trash2}
          label="Löschen"
          danger
          onClick={() =>
            run(() => {
              deleteElement(el.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "elements") {
    const selected = elements.filter((e) => target.ids.includes(e.id));
    body = (
      <>
        <Header title={`${selected.length} Elemente`} subtitle="Ausrichten & bearbeiten" />
        <Section label="Ausrichten" />
        <div className="grid grid-cols-3 gap-1 px-2 pb-1">
          {ALIGN_ROW.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              title={label}
              className="flex items-center justify-center rounded-md p-2 text-[var(--text)] hover:bg-[var(--control-hover)]"
              onClick={() =>
                run(() => {
                  const patches = computeAlignPatches(selected, mode, target.ids[0]);
                  if (patches.length) patchElements(patches);
                })
              }
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <Item
          icon={AlignHorizontalSpaceBetween}
          label="Horizontal verteilen"
          disabled={selected.length < 3}
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "distributeX");
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Item
          icon={AlignVerticalSpaceBetween}
          label="Vertikal verteilen"
          disabled={selected.length < 3}
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "distributeY");
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Item
          icon={StretchHorizontal}
          label="Gleiche Breite"
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "sameWidth", target.ids[0]);
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Item
          icon={StretchVertical}
          label="Gleiche Höhe"
          onClick={() =>
            run(() => {
              const patches = computeAlignPatches(selected, "sameHeight", target.ids[0]);
              if (patches.length) patchElements(patches);
            })
          }
        />
        <Separator />
        <Item
          icon={ClipboardList}
          label="In Zwischenablage verschieben"
          onClick={() => run(() => moveToClipboard(target.ids))}
        />
        <Item
          icon={Trash2}
          label="Alle löschen"
          danger
          onClick={() =>
            run(() => {
              for (const id of target.ids) deleteElement(id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "relation") {
    const rel = relations.find((r) => r.id === target.id);
    if (!rel) return null;
    body = (
      <>
        <Header title="Relation" subtitle={RELATION_TYPE_LABELS[rel.type]} />
        <Section label="Typ" />
        {RELATION_TYPES.map((t) => (
          <Item
            key={t}
            label={RELATION_TYPE_LABELS[t]}
            active={rel.type === t}
            onClick={() => run(() => updateRelation(rel.id, { type: t }))}
          />
        ))}
        <Item
          icon={HelpCircle}
          label="Hilfe"
          onClick={() => run(() => onRequestHelpRelationType?.(rel.type))}
        />
        <Separator />
        <Item
          icon={Trash2}
          label="Löschen"
          danger
          onClick={() =>
            run(() => {
              deleteRelation(rel.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "contextRelation") {
    const rel = contextRelations.find((r) => r.id === target.id);
    if (!rel) return null;
    body = (
      <>
        <Header title="Context Map" subtitle={CONTEXT_MAP_PATTERN_LABELS[rel.type]} />
        <Section label="Muster" />
        {CONTEXT_PATTERNS.map((t) => (
          <Item
            key={t}
            label={CONTEXT_MAP_PATTERN_LABELS[t]}
            active={rel.type === t}
            onClick={() => run(() => updateContextRelation(rel.id, { type: t }))}
          />
        ))}
        <Item
          label="Label ändern…"
          onClick={() =>
            run(() => {
              const next = window.prompt("Label", rel.label ?? "");
              if (next !== null) updateContextRelation(rel.id, { label: next || undefined });
            })
          }
        />
        <Item
          icon={HelpCircle}
          label="Hilfe"
          onClick={() => run(() => onRequestHelpContextMap?.(rel.type))}
        />
        <Separator />
        <Item
          icon={Trash2}
          label="Löschen"
          danger
          onClick={() =>
            run(() => {
              deleteContextRelation(rel.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "swimlane") {
    const lane = swimlanes.find((l) => l.id === target.id);
    if (!lane) return null;
    body = (
      <>
        <Header title={lane.label} subtitle="Swimlane" />
        <Item
          icon={Trash2}
          label="Löschen"
          danger
          onClick={() =>
            run(() => {
              deleteSwimlane(lane.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "boundedContext") {
    const bc = boundedContexts.find((b) => b.id === target.id);
    if (!bc) return null;
    body = (
      <>
        <Header title={bc.label} subtitle="Bounded Context" />
        <Item
          icon={Link2}
          label="Context Map verbinden"
          onClick={() =>
            run(() => {
              setContextMapMode(true);
              setContextMapDraftSource(bc.id);
            })
          }
        />
        <Item
          icon={Trash2}
          label="Löschen"
          danger
          onClick={() =>
            run(() => {
              deleteBoundedContext(bc.id);
              clearSelection();
            })
          }
        />
      </>
    );
  } else if (target.kind === "timeline") {
    body = (
      <>
        <Header title="Timeline" subtitle="Position & Beschriftung" />
        <Item
          label="Start-Label ändern…"
          onClick={() =>
            run(() => {
              const next = window.prompt("Start-Label", timeline.startLabel ?? "Start");
              if (next !== null) setTimeline({ startLabel: next });
            })
          }
        />
        <Item
          label="Ende-Label ändern…"
          onClick={() =>
            run(() => {
              const next = window.prompt("Ende-Label", timeline.endLabel ?? "Ende");
              if (next !== null) setTimeline({ endLabel: next });
            })
          }
        />
        <Item
          label="Ausblenden"
          onClick={() => run(() => setTimeline({ visible: false }))}
        />
      </>
    );
  } else {
    body = (
      <>
        <Header title="Canvas" subtitle="Schnellaktionen" />
        <Item
          label={`Element hinzufügen (${ELEMENT_STYLES[paletteType].shortLabel})`}
          onClick={() =>
            run(() => addElement(paletteType, target.worldX, target.worldY))
          }
        />
        {clipboard && clipboard.elements.length > 0 && (
          <Item
            icon={ClipboardPaste}
            label={`Zwischenablage einfügen (${clipboard.elements.length})`}
            onClick={() => run(() => pasteClipboardAt(target.worldX, target.worldY))}
          />
        )}
        {timeline.visible === false && (
          <Item
            label="Timeline einblenden"
            onClick={() => run(() => setTimeline({ visible: true }))}
          />
        )}
        <Item label="Auswahl aufheben" onClick={() => run(() => clearSelection())} />
      </>
    );
  }

  const layer = (
    <div
      ref={ref}
      role="menu"
      className="dock-surface fixed z-[1200] min-w-[220px] max-w-[280px] overflow-hidden rounded-dock py-1.5 text-sm text-[var(--text)]"
      style={{ left: pos.left || menu.x, top: pos.top || menu.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {body}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-[var(--border)] px-3 pb-2 pt-1.5">
      <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
      <p className="text-[0.72rem] text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return <p className="group-label px-3 pb-1 pt-2">{label}</p>;
}

function Separator() {
  return <div className="my-1.5 border-t border-[var(--border)]" />;
}

function Item({
  label,
  onClick,
  icon: Icon,
  danger,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  icon?: typeof Trash2;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.82rem] disabled:opacity-40",
        danger
          ? "text-[#f0a8a0] hover:bg-[#3a2220]"
          : active
            ? "bg-[#1e3a36] text-[#b8f0e6]"
            : "text-[var(--text)] hover:bg-[var(--control-hover)]",
      ].join(" ")}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" /> : <span className="w-3.5" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function Submenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group border-b border-[var(--border)] last:border-0">
      <summary className="cursor-pointer list-none px-3 py-1.5 text-[0.82rem] text-[var(--muted)] hover:bg-[var(--control-hover)] hover:text-[var(--text)] [&::-webkit-details-marker]:hidden">
        {label} ▸
      </summary>
      <div className="bg-[rgba(0,0,0,0.15)] pb-1">{children}</div>
    </details>
  );
}
