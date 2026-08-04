"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ChevronDown, ExternalLink, HelpCircle, Trash2 } from "lucide-react";

import { activateBoardLink } from "@/lib/board-link";
import { BoundedContextDetailPanel } from "@/components/bounded-context-detail-panel";
import { RegionAppearanceControls } from "@/components/region-appearance-controls";
import { lineArrowHeadShortLabel } from "@/components/canvas-lines";
import { ELEMENT_STYLES } from "@/lib/element-styles";
import { normalizeRotationDegrees } from "@/lib/element-rotation";
import { NOTE_COLOR_IDS, NOTE_COLORS } from "@/lib/note-colors";
import { validateBoard } from "@/lib/relation-validation";
import { JsonValueEditor } from "@/components/json-value-editor";
import type { RelationType } from "@/types/storm-relation";
import type {
  DataCardinality,
  ElementType,
  GatewayKind,
  LinkKind,
  NoteColorId,
  QuestionStatus,
  StoryPriority,
  SubdomainKind,
} from "@/types/storm-element";
import { supportsArchDrilldown } from "@/types/storm-element";
import { LINE_ARROW_HEADS, LINE_ARROW_HEAD_LABELS } from "@/types/canvas-annotation";
import { useStormBoardStore } from "@/store/storm-board-store";

const MIN_ELEMENT_SIZE = 40;

function linesFromMeta(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

function linesToMeta(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export interface ElementDetailSidebarProps {
  onRequestHelpElementType?: (type: ElementType) => void;
  onRequestHelpRelationType?: (type: RelationType) => void;
}

/** Inspector for continuous editing. Discrete actions live in the context menu. */
export function ElementDetailSidebar({
  onRequestHelpElementType,
  onRequestHelpRelationType,
}: ElementDetailSidebarProps) {
  const elements = useStormBoardStore((s) => s.elements);
  const relations = useStormBoardStore((s) => s.relations);
  const canvasLines = useStormBoardStore((s) => s.canvasLines);
  const selectedElementIds = useStormBoardStore((s) => s.selectedElementIds);
  const selectedRelationId = useStormBoardStore((s) => s.selectedRelationId);
  const selectedCanvasLineId = useStormBoardStore((s) => s.selectedCanvasLineId);
  const selectedBoundedContextId = useStormBoardStore((s) => s.selectedBoundedContextIds[0] ?? null);
  const selectedSwimlaneId = useStormBoardStore((s) => s.selectedSwimlaneIds[0] ?? null);
  const updateElement = useStormBoardStore((s) => s.updateElement);
  const updateRelation = useStormBoardStore((s) => s.updateRelation);
  const updateCanvasLine = useStormBoardStore((s) => s.updateCanvasLine);
  const deleteCanvasLine = useStormBoardStore((s) => s.deleteCanvasLine);
  const updateSwimlane = useStormBoardStore((s) => s.updateSwimlane);
  const openBuildingBlockView = useStormBoardStore((s) => s.openBuildingBlockView);
  const navigateBuildingBlockViewLink = useStormBoardStore((s) => s.navigateBuildingBlockViewLink);
  const boundedContexts = useStormBoardStore((s) => s.boundedContexts);
  const swimlanes = useStormBoardStore((s) => s.swimlanes);
  const views = useStormBoardStore((s) => s.views);
  const activeViewId = useStormBoardStore((s) => s.activeViewId);

  const contextRelations = useStormBoardStore((s) => s.contextRelations);
  const selectedElement = elements.find((e) => e.id === selectedElementIds[0]);
  const selectedRelation = relations.find((r) => r.id === selectedRelationId);
  const selectedCanvasLine = canvasLines.find((line) => line.id === selectedCanvasLineId);
  const selectedBoundedContext = boundedContexts.find((bc) => bc.id === selectedBoundedContextId);
  const selectedSwimlane = swimlanes.find((lane) => lane.id === selectedSwimlaneId);
  const multiCount = selectedElementIds.length;

  const issues = useMemo(
    () =>
      validateBoard(elements, relations, contextRelations).filter(
        (i) => i.elementId === selectedElement?.id,
      ),
    [elements, relations, contextRelations, selectedElement?.id],
  );

  if (selectedCanvasLine) {
    const arrowHead = selectedCanvasLine.arrowHead ?? "none";
    return (
      <DockPanel title="Freie Linie">
        <Field label="Label">
          <input
            className="dock-field"
            value={selectedCanvasLine.label ?? ""}
            onChange={(e) => updateCanvasLine(selectedCanvasLine.id, { label: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <Field label="Pfeil">
          <div className="flex gap-1" role="group" aria-label="Pfeilrichtung">
            {LINE_ARROW_HEADS.map((head) => (
              <button
                key={head}
                type="button"
                title={LINE_ARROW_HEAD_LABELS[head]}
                aria-label={LINE_ARROW_HEAD_LABELS[head]}
                aria-pressed={arrowHead === head}
                className={[
                  "flex h-8 flex-1 items-center justify-center rounded-md text-sm font-medium transition",
                  arrowHead === head
                    ? "dock-control-active"
                    : "dock-control hover:bg-[var(--control-hover)]",
                ].join(" ")}
                onClick={() => updateCanvasLine(selectedCanvasLine.id, { arrowHead: head })}
              >
                {lineArrowHeadShortLabel(head)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Farbe">
          <input
            className="dock-field h-9 cursor-pointer p-1"
            type="color"
            value={selectedCanvasLine.color ?? "#64748b"}
            onChange={(e) => updateCanvasLine(selectedCanvasLine.id, { color: e.target.value })}
          />
        </Field>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[#f0a8a0] hover:border-[#f0a8a0]"
          onClick={() => deleteCanvasLine(selectedCanvasLine.id)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Löschen
        </button>
      </DockPanel>
    );
  }

  if (selectedRelation) {
    return (
      <DockPanel
        title="Relation"
        onHelp={() => onRequestHelpRelationType?.(selectedRelation.type)}
      >
        <Field label="Label">
          <input
            className="dock-field"
            value={selectedRelation.label ?? ""}
            onChange={(e) => updateRelation(selectedRelation.id, { label: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <p className="text-[0.7rem] text-[var(--muted)]">Typ und Löschen: Rechtsklick</p>
      </DockPanel>
    );
  }

  if (multiCount >= 2) {
    return (
      <DockPanel title={`${multiCount} Elemente`}>
        <p className="text-[0.82rem] text-[var(--muted)]">
          Ausrichten, Verteilen und Löschen über Rechtsklick.
        </p>
      </DockPanel>
    );
  }

  if (!selectedElement) {
    if (selectedSwimlane) {
      return (
        <DockPanel title="Swimlane">
          <Field label="Label">
            <input
              className="dock-field"
              value={selectedSwimlane.label}
              onChange={(e) => updateSwimlane(selectedSwimlane.id, { label: e.target.value })}
            />
          </Field>
          <RegionAppearanceControls
            kind="swimlane"
            region={selectedSwimlane}
            onChange={(patch) => updateSwimlane(selectedSwimlane.id, patch)}
          />
          <CollapsibleSection title="Position & Größe" defaultOpen={false}>
            {selectedSwimlane.locked && (
              <p className="mb-2 text-[0.65rem] text-[var(--muted)]">
                Gesperrt — Position und Größe sind geschützt.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="X"
                value={selectedSwimlane.x ?? 0}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { x: v })}
              />
              <NumberField
                label="Y"
                value={selectedSwimlane.y}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { y: v })}
              />
              <NumberField
                label="Breite"
                value={selectedSwimlane.width ?? 4000}
                min={80}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { width: Math.max(80, v) })}
              />
              <NumberField
                label="Höhe"
                value={selectedSwimlane.height}
                min={80}
                disabled={selectedSwimlane.locked}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { height: Math.max(80, v) })}
              />
              <NumberField
                label="Ebene (z)"
                value={selectedSwimlane.zIndex ?? 0}
                onChange={(v) => updateSwimlane(selectedSwimlane.id, { zIndex: v })}
              />
            </div>
          </CollapsibleSection>
        </DockPanel>
      );
    }

    if (selectedBoundedContext) {
      return (
        <DockPanel title="Bounded Context">
          <BoundedContextDetailPanel boundedContext={selectedBoundedContext} />
        </DockPanel>
      );
    }

    return null;
  }

  const style = ELEMENT_STYLES[selectedElement.type];
  const width = selectedElement.width ?? style.defaultWidth;
  const height = selectedElement.height ?? style.defaultHeight;
  const cardFlagsActive = Boolean(
    selectedElement.metadata?.showDescriptionOnCard ||
      selectedElement.metadata?.showAttributesOnCard ||
      selectedElement.metadata?.showMethodsOnCard,
  );

  return (
    <DockPanel
      title={style.label}
      onHelp={() => onRequestHelpElementType?.(selectedElement.type)}
    >
      <Field label="Label">
        <input
          className="dock-field"
          value={selectedElement.label}
          onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
        />
      </Field>
      <Field label="Beschreibung">
        <textarea
          className="dock-field min-h-[4.5rem]"
          rows={3}
          value={selectedElement.description ?? ""}
          onChange={(e) => updateElement(selectedElement.id, { description: e.target.value })}
        />
      </Field>

      <CollapsibleSection
        title="Auf der Karte"
        defaultOpen={cardFlagsActive || selectedElement.type === "note"}
        hint={cardFlagsActive ? "aktiv" : undefined}
      >
        <div className="flex flex-col gap-1.5 text-xs text-[var(--text)]">
          {(
            [
              ["showDescriptionOnCard", "Beschreibung"],
              ["showAttributesOnCard", "Attribute"],
              ["showMethodsOnCard", "Methoden"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(selectedElement.metadata?.[key])}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        {selectedElement.type === "note" && (
          <div className="mt-2">
            <p className="mb-1.5 text-[0.65rem] font-medium text-[var(--muted)]">Hintergrund</p>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_COLOR_IDS.map((id) => {
                const c = NOTE_COLORS[id];
                const active = (selectedElement.metadata?.noteColor ?? "cream") === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={active}
                    className={[
                      "h-7 w-7 rounded-md border-2 shadow-sm transition-transform",
                      active ? "scale-110 border-[var(--accent)]" : "border-transparent hover:scale-105",
                    ].join(" ")}
                    style={{ backgroundColor: c.fill, boxShadow: `inset 0 0 0 1px ${c.stroke}` }}
                    onClick={() =>
                      updateElement(selectedElement.id, {
                        metadata: {
                          ...selectedElement.metadata,
                          noteColor: id as NoteColorId,
                        },
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Position & Größe" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="X"
            value={selectedElement.x}
            onChange={(v) => updateElement(selectedElement.id, { x: v })}
          />
          <NumberField
            label="Y"
            value={selectedElement.y}
            onChange={(v) => updateElement(selectedElement.id, { y: v })}
          />
          <NumberField
            label="Breite"
            value={width}
            min={MIN_ELEMENT_SIZE}
            onChange={(v) =>
              updateElement(selectedElement.id, {
                width: Math.max(MIN_ELEMENT_SIZE, v),
              })
            }
          />
          <NumberField
            label="Höhe"
            value={height}
            min={MIN_ELEMENT_SIZE}
            onChange={(v) =>
              updateElement(selectedElement.id, {
                height: Math.max(MIN_ELEMENT_SIZE, v),
              })
            }
          />
          <NumberField
            label="Drehung (°)"
            value={selectedElement.rotation ?? style.rotation ?? 0}
            onChange={(v) =>
              updateElement(selectedElement.id, {
                rotation: normalizeRotationDegrees(v),
              })
            }
          />
        </div>
      </CollapsibleSection>

      {(selectedElement.type === "domainEvent" || selectedElement.type === "aggregate") && (
        <Field label="Event Schema">
          <JsonValueEditor
            value={selectedElement.metadata?.eventSchema}
            onChange={(eventSchema) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, eventSchema },
              })
            }
            emptyHint="Keine Schema-Felder — typischerweise Name → Typ"
          />
        </Field>
      )}

      {selectedElement.type === "aggregate" && (
        <>
          <Field label="Attribute (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.attributes)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. status: OrderStatus\ntotal: Money"}
            />
          </Field>
          <Field label="Methoden (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={(selectedElement.metadata?.aggregateMethods ?? []).join("\n")}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateMethods: e.target.value.split("\n").filter(Boolean),
                  },
                })
              }
            />
          </Field>
          <Field label="Invarianten (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={(selectedElement.metadata?.aggregateInvariants ?? []).join("\n")}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateInvariants: e.target.value.split("\n").filter(Boolean),
                  },
                })
              }
              placeholder="z. B. Balance darf nicht negativ sein"
            />
          </Field>
        </>
      )}

      {selectedElement.type === "entity" && (
        <>
          <Field label="Identität (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[2.5rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.identityFields)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    identityFields: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. id\ncustomerId"}
            />
          </Field>
          <Field label="Attribute (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.attributes)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. name: string\nemail: Email"}
            />
          </Field>
          <Field label="Operationen (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.operations)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. rename(name)\nchangeEmail(email)"}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "valueObject" && (
        <>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={selectedElement.metadata?.immutable !== false}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    immutable: e.target.checked,
                  },
                })
              }
            />
            Unveränderlich (immutable)
          </label>
          <Field label="Attribute / Komponenten (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.attributes)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. amount: decimal\ncurrency: string"}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "domainService" && (
        <>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={selectedElement.metadata?.stateless !== false}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    stateless: e.target.checked,
                  },
                })
              }
            />
            Zustandslos (stateless)
          </label>
          <Field label="Operationen (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.operations)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. transfer(from, to, money)\ncalculateRisk(order)"}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "repository" && (
        <>
          <Field label="Aggregate Root">
            <input
              className="dock-field"
              value={selectedElement.metadata?.aggregateRootRef ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    aggregateRootRef: e.target.value,
                  },
                })
              }
              placeholder="z. B. Order"
            />
          </Field>
          <Field label="Operationen (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.operations)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. findById(id)\nsave(aggregate)\nnextIdentity()"}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "factory" && (
        <>
          <Field label="Erzeugt">
            <input
              className="dock-field"
              value={selectedElement.metadata?.createsRef ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    createsRef: e.target.value,
                  },
                })
              }
              placeholder="z. B. Order / Customer"
            />
          </Field>
          <Field label="Operationen (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.operations)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    operations: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. createFromDraft(draft)\nreconstitute(snapshot)"}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "subdomain" && (
        <Field label="Subdomain-Art">
          <select
            className="dock-field"
            value={selectedElement.metadata?.subdomainKind ?? "core"}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  subdomainKind: e.target.value as SubdomainKind,
                },
              })
            }
          >
            <option value="core">Core Domain</option>
            <option value="supporting">Supporting</option>
            <option value="generic">Generic</option>
          </select>
        </Field>
      )}

      {selectedElement.type === "rule" && (
        <Field label="Kriterien / Hinweise (eine pro Zeile)">
          <textarea
            className="dock-field min-h-[4rem]"
            rows={3}
            value={linesFromMeta(selectedElement.metadata?.ruleCriteria)}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  ruleCriteria: linesToMeta(e.target.value),
                },
              })
            }
            placeholder={"z. B. Nur für registrierte Kunden\nMax. 3 Retouren / Jahr"}
          />
        </Field>
      )}

      {selectedElement.type === "example" && (
        <>
          <Field label="Given (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.exampleGiven)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    exampleGiven: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder="Ausgangssituation"
            />
          </Field>
          <Field label="When (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.exampleWhen)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    exampleWhen: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder="Aktion"
            />
          </Field>
          <Field label="Then (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.exampleThen)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    exampleThen: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder="Erwartetes Ergebnis"
            />
          </Field>
        </>
      )}

      {selectedElement.type === "question" && (
        <Field label="Status">
          <select
            className="dock-field"
            value={selectedElement.metadata?.questionStatus ?? "open"}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  questionStatus: e.target.value as QuestionStatus,
                },
              })
            }
          >
            <option value="open">Offen</option>
            <option value="resolved">Geklärt</option>
          </select>
        </Field>
      )}

      {selectedElement.type === "userStory" && (
        <>
          <Field label="Persona">
            <input
              className="dock-field"
              value={selectedElement.metadata?.storyPersona ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    storyPersona: e.target.value,
                  },
                })
              }
              placeholder="z. B. Einkäuferin"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Priorität">
              <select
                className="dock-field"
                value={selectedElement.metadata?.storyPriority ?? "must"}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      storyPriority: e.target.value as StoryPriority,
                    },
                  })
                }
              >
                <option value="must">Must</option>
                <option value="should">Should</option>
                <option value="could">Could</option>
                <option value="wont">Won't</option>
              </select>
            </Field>
            <Field label="Schätzung">
              <input
                className="dock-field"
                value={selectedElement.metadata?.storyEstimate ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      storyEstimate: e.target.value,
                    },
                  })
                }
                placeholder="z. B. 3"
              />
            </Field>
          </div>
          <Field label="Akzeptanzkriterien (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.storyAcceptance)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    storyAcceptance: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {(selectedElement.type === "release" || selectedElement.type === "slice") && (
        <Field label={selectedElement.type === "slice" ? "Slice-Ziel" : "Release-Ziel"}>
          <input
            className="dock-field"
            value={selectedElement.metadata?.releaseGoal ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  releaseGoal: e.target.value,
                },
              })
            }
            placeholder={
              selectedElement.type === "slice"
                ? "z. B. Bestellung anlegen End-to-End"
                : "z. B. MVP: Bestellen & Bezahlen"
            }
          />
        </Field>
      )}

      {selectedElement.type === "slice" && (
        <Field label="Systeme / Lanes (eine pro Zeile)">
          <textarea
            className="dock-field min-h-[3rem]"
            rows={2}
            value={linesFromMeta(selectedElement.metadata?.sliceSystems)}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: {
                  ...selectedElement.metadata,
                  sliceSystems: linesToMeta(e.target.value),
                },
              })
            }
            placeholder={"z. B. Web UI\nOrder Service"}
          />
        </Field>
      )}

      {selectedElement.type === "processActivity" && (
        <>
          <Field label="Rolle / Verantwortlich">
            <input
              className="dock-field"
              value={selectedElement.metadata?.processRole ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, processRole: e.target.value },
                })
              }
            />
          </Field>
          <Field label="System">
            <input
              className="dock-field"
              value={selectedElement.metadata?.processSystem ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, processSystem: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Dauer / SLA">
            <input
              className="dock-field"
              value={selectedElement.metadata?.processDuration ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, processDuration: e.target.value },
                })
              }
              placeholder="z. B. < 1 Tag"
            />
          </Field>
          <Field label="Eingaben (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.processInputs)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    processInputs: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Ausgaben (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.processOutputs)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    processOutputs: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {selectedElement.type === "processGateway" && (
        <>
          <Field label="Gateway-Art">
            <select
              className="dock-field"
              value={selectedElement.metadata?.gatewayKind ?? "xor"}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    gatewayKind: e.target.value as GatewayKind,
                  },
                })
              }
            >
              <option value="xor">XOR (exklusiv)</option>
              <option value="and">AND (parallel)</option>
              <option value="or">OR (inklusiv)</option>
            </select>
          </Field>
          <Field label="Bedingungen / Pfade (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={3}
              value={linesFromMeta(selectedElement.metadata?.gatewayConditions)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    gatewayConditions: linesToMeta(e.target.value),
                  },
                })
              }
              placeholder={"z. B. genehmigt\nabgelehnt"}
            />
          </Field>
        </>
      )}

      {selectedElement.type === "processStart" && (
        <Field label="Auslöser">
          <input
            className="dock-field"
            value={selectedElement.metadata?.processTrigger ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, processTrigger: e.target.value },
              })
            }
          />
        </Field>
      )}

      {selectedElement.type === "processEnd" && (
        <Field label="Ergebnis">
          <input
            className="dock-field"
            value={selectedElement.metadata?.processResult ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, processResult: e.target.value },
              })
            }
          />
        </Field>
      )}

      {selectedElement.type === "dataEntity" && (
        <>
          <Field label="Tabellenname (optional)">
            <input
              className="dock-field"
              value={selectedElement.metadata?.dataTableName ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, dataTableName: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Primärschlüssel / Identität (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.identityFields)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    identityFields: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Attribute (eine pro Zeile, z. B. name: string)">
            <textarea
              className="dock-field min-h-[4rem]"
              rows={4}
              value={linesFromMeta(selectedElement.metadata?.attributes)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Unique Keys (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[2.5rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.dataUniqueKeys)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    dataUniqueKeys: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {selectedElement.type === "dataAssociation" && (
        <>
          <Field label="Kardinalität">
            <select
              className="dock-field"
              value={selectedElement.metadata?.dataCardinality ?? "1:n"}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    dataCardinality: e.target.value as DataCardinality,
                  },
                })
              }
            >
              <option value="1:1">1:1</option>
              <option value="1:n">1:n</option>
              <option value="n:1">n:1</option>
              <option value="n:m">n:m</option>
            </select>
          </Field>
          <Field label="Linke Entität">
            <input
              className="dock-field"
              value={selectedElement.metadata?.dataLeftEntity ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, dataLeftEntity: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Rechte Entität">
            <input
              className="dock-field"
              value={selectedElement.metadata?.dataRightEntity ?? ""}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: { ...selectedElement.metadata, dataRightEntity: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Beziehungsattribute (eine pro Zeile)">
            <textarea
              className="dock-field min-h-[3rem]"
              rows={2}
              value={linesFromMeta(selectedElement.metadata?.attributes)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    attributes: linesToMeta(e.target.value),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {supportsArchDrilldown(selectedElement.type) && (
        <div className="space-y-1.5">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--accent)]"
            onClick={() => {
              const linked = selectedElement.detailViewId?.trim();
              if (linked && views.some((v) => v.id === linked)) {
                navigateBuildingBlockViewLink(selectedElement.id);
              } else {
                openBuildingBlockView(selectedElement.id);
              }
            }}
          >
            {selectedElement.detailViewId &&
            views.some((v) => v.id === selectedElement.detailViewId)
              ? "Detail-Sicht öffnen"
              : "Detail-Sicht erstellen"}
          </button>
          <p className="text-[0.72rem] text-[var(--muted)]">
            {selectedElement.type === "c4SoftwareSystem"
              ? "C4 Zoom: Container-Diagramm — Whitebox-Scope mit Containern."
              : selectedElement.type === "c4Container"
                ? "C4 Zoom: Komponenten-Diagramm — Whitebox-Scope mit Komponenten."
                : selectedElement.type === "archBlackbox"
                  ? "Öffnet die Whitebox dieses Bausteins (C4-ähnlicher Drill-down)."
                  : "Zoom in die nächste Verfeinerungsebene."}
          </p>
        </div>
      )}

      {(selectedElement.type === "c4Container" ||
        selectedElement.type === "c4Component" ||
        selectedElement.type === "archComponent") && (
        <Field label="Technologie">
          <input
            className="dock-field"
            placeholder="z. B. Spring Boot, PostgreSQL"
            value={selectedElement.metadata?.c4Technology ?? ""}
            onChange={(e) =>
              updateElement(selectedElement.id, {
                metadata: { ...selectedElement.metadata, c4Technology: e.target.value },
              })
            }
          />
        </Field>
      )}

      {selectedElement.type === "link" && (
        <>
          <Field label="Zielart">
            <select
              className="dock-field"
              value={selectedElement.metadata?.linkKind ?? "external"}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  metadata: {
                    ...selectedElement.metadata,
                    linkKind: e.target.value as LinkKind,
                  },
                })
              }
            >
              <option value="external">Externe URL</option>
              <option value="view">Board-Sicht</option>
            </select>
          </Field>
          {(selectedElement.metadata?.linkKind ?? "external") === "external" ? (
            <Field label="URL">
              <input
                className="dock-field"
                type="url"
                placeholder="https://…"
                value={selectedElement.metadata?.linkUrl ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: { ...selectedElement.metadata, linkUrl: e.target.value },
                  })
                }
              />
            </Field>
          ) : (
            <Field label="Sicht">
              <select
                className="dock-field"
                value={selectedElement.metadata?.linkViewId ?? ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    metadata: {
                      ...selectedElement.metadata,
                      linkViewId: e.target.value || undefined,
                    },
                  })
                }
              >
                <option value="">— wählen —</option>
                {views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.id === activeViewId ? " (aktuell)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)]"
            onClick={() => {
              const result = activateBoardLink(selectedElement);
              if (!result.ok) {
                window.alert(result.reason);
              }
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Öffnen
          </button>
        </>
      )}

      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex gap-2 rounded-lg bg-[rgba(233,196,106,0.12)] px-2 py-1.5 text-[0.72rem] text-[var(--accent-2)]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {issue.message}
        </div>
      ))}

      <p className="text-[0.7rem] text-[var(--muted)]">Mehr: Rechtsklick</p>
    </DockPanel>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  hint,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-[var(--border)]/70 bg-[var(--control)]/20">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[0.72rem] font-medium text-[var(--muted)] hover:text-[var(--text)]"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={[
            "size-3.5 shrink-0 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          ].join(" ")}
          aria-hidden
        />
        <span className="flex-1">{title}</span>
        {hint && !open && (
          <span className="text-[0.65rem] font-normal text-[var(--accent)]">{hint}</span>
        )}
      </button>
      {open && <div className="space-y-2 border-t border-[var(--border)]/60 px-2.5 py-2">{children}</div>}
    </div>
  );
}

function DockPanel({
  title,
  onHelp,
  children,
}: {
  title: string;
  onHelp?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            className="dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
            title="Hilfe"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[0.72rem] font-medium text-[var(--muted)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        disabled={disabled}
        className="dock-field disabled:opacity-50"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </Field>
  );
}
