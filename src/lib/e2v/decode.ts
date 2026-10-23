import { normalizeAppearance } from "@/lib/board-appearance";
import { normalizeActionItems } from "@/lib/action-items";
import { normalizeActionsView, normalizeMeasureActionItem } from "@/lib/architecture-measures";
import { applyE2vTagFilterLine } from "@/lib/measure-tag-filters";
import type { BoardImportPayload, BoardView } from "@/lib/storm-json";
import {
  normalizeBoardDocument,
  normalizeBoardView,
  normalizeStormElement,
} from "@/lib/storm-json";
import type { ActionsViewConfig, MeasureActionItem } from "@/types/actions-view";
import {
  DEFAULT_VIEWPORT,
  defaultTimelineForModelingMode,
  modelingModeUsesTimelineByDefault,
  normalizeModelingMode,
  normalizeWorkshopFormatForMode,
  type ModelingMode,
  type WorkshopFormat,
} from "@/types/storm-element";
import { generateStormId } from "@/lib/storm-id";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { CanvasLine } from "@/types/canvas-annotation";
import type { CustomCardType } from "@/lib/custom-card-types";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import type {
  BoundedContext,
  GlossaryEntry,
  StormElement,
  Swimlane,
  Timeline,
  Viewport,
} from "@/types/storm-element";

/** Mutable parse buffer for one `@view` … `@endview` block. */
interface E2vActionsViewDraft {
  kind: "actions";
  id: string;
  name: string;
  config: ActionsViewConfig;
  items: MeasureActionItem[];
}

interface E2vViewDraft {
  kind: "canvas";
  id: string;
  name: string;
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  connectors: BoardConnector[];
  canvasLines: CanvasLine[];
  customCardTypes: CustomCardType[];
  timeline: Timeline;
  viewport: Viewport;
  snapToTimeline: boolean;
  snapToGrid: boolean;
}

import { E2V_FORMAT, E2V_MAGIC } from "@/lib/e2v/constants";
import { isE2vRelationType, normalizeE2vElementType } from "@/lib/e2v/llm-shorthand";
import { optionalIdCell, parseCell, splitRow } from "@/lib/e2v/text";

function parseEndpoint(raw: string, idMap: Map<string, string>): ConnectorEndpoint {
  const t = raw.trim();
  if (t.startsWith("element:")) {
    const a = t.slice(8);
    return { attach: "element", id: idMap.get(a) ?? a };
  }
  if (t.startsWith("swimlane:")) {
    const a = t.slice(9);
    return { attach: "swimlane", id: idMap.get(a) ?? a };
  }
  if (t.startsWith("bc:")) {
    const a = t.slice(3);
    return { attach: "boundedContext", id: idMap.get(a) ?? a };
  }
  if (t.startsWith("point:")) {
    const coords = t.slice(6).split(",");
    const x = Number(coords[0]);
    const y = Number(coords[1]);
    return { attach: "point", x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
  }
  return { attach: "point", x: 0, y: 0 };
}

function num(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function mapId(alias: string, idMap: Map<string, string>, remap: Map<string, string>): string {
  const key = alias.trim();
  if (!key) return generateStormId();
  const real = idMap.get(key) ?? key;
  let assigned = remap.get(real);
  if (!assigned) {
    assigned = generateStormId();
    remap.set(real, assigned);
    remap.set(key, assigned);
  }
  return assigned;
}

export function isE2vText(text: string): boolean {
  const first = text.trimStart().split(/\r?\n/, 1)[0]?.trim() ?? "";
  return first === E2V_MAGIC || first.startsWith("# e2v/");
}

export function decodeE2vText(text: string): BoardImportPayload | null {
  if (!isE2vText(text)) return null;
  const lines = text.split(/\r?\n/);

  let title = "Board";
  let activeViewId = "";
  let workshopMode = false;
  let appearance = normalizeAppearance(undefined);
  const glossary: GlossaryEntry[] = [];
  const actionItemsRaw: Array<Record<string, unknown>> = [];
  const views: BoardView[] = [];

  const globalIdMap = new Map<string, string>();
  const parseState = {
    viewDraft: null as E2vViewDraft | E2vActionsViewDraft | null,
  };
  let viewIdMap = new Map<string, string>();
  const descPending = new Map<string, string>();
  const metaPending = new Map<string, Record<string, unknown>>();

  const flushView = () => {
    if (!parseState.viewDraft) return;
    if (parseState.viewDraft.kind === "actions") {
      views.push(normalizeActionsView(parseState.viewDraft));
      parseState.viewDraft = null;
      viewIdMap = new Map(globalIdMap);
      return;
    }
    const idRemap = new Map<string, string>();
    const resolve = (alias: string) => mapId(alias, viewIdMap, idRemap);

    const elements = (parseState.viewDraft.elements ?? []).map((el) => {
      const raw = el as StormElement;
      const id = resolve(raw.id);
      const next: StormElement = {
        ...raw,
        id,
        swimlaneId: raw.swimlaneId ? resolve(raw.swimlaneId) : undefined,
        boundedContextId: raw.boundedContextId ? resolve(raw.boundedContextId) : undefined,
        aggregateId: raw.aggregateId ? resolve(raw.aggregateId) : undefined,
        subdomainId: raw.subdomainId ? resolve(raw.subdomainId) : undefined,
      };
      const alias = [...viewIdMap.entries()].find(([, r]) => r === raw.id)?.[0] ?? raw.id;
      const d = descPending.get(alias);
      if (d) next.description = d;
      const m = metaPending.get(alias);
      if (m) next.metadata = m as StormElement["metadata"];
      return normalizeStormElement(next);
    });

    const swimlanes = (parseState.viewDraft.swimlanes ?? []).map((s) => ({
      ...s,
      id: resolve(s.id),
    }));
    const boundedContexts = (parseState.viewDraft.boundedContexts ?? []).map((b) => ({
      ...b,
      id: resolve(b.id),
      detailViewId: b.detailViewId || undefined,
    }));

    const relations = (parseState.viewDraft.relations ?? []).map((r) => ({
      ...r,
      id: resolve(r.id),
      sourceId: resolve(r.sourceId),
      targetId: resolve(r.targetId),
    })) as StormRelation[];

    const contextRelations = (parseState.viewDraft.contextRelations ?? []).map((r) => ({
      ...r,
      id: resolve(r.id),
      sourceContextId: resolve(r.sourceContextId),
      targetContextId: resolve(r.targetContextId),
    })) as ContextRelation[];

    const connectors = (parseState.viewDraft.connectors ?? []).map((c) => {
      const remapEp = (ep: ConnectorEndpoint): ConnectorEndpoint => {
        if (ep.attach === "element") return { attach: "element", id: resolve(ep.id) };
        if (ep.attach === "swimlane") return { attach: "swimlane", id: resolve(ep.id) };
        if (ep.attach === "boundedContext") return { attach: "boundedContext", id: resolve(ep.id) };
        return ep;
      };
      return {
        ...c,
        id: resolve(c.id),
        source: remapEp(c.source),
        target: remapEp(c.target),
      } as BoardConnector;
    });

    const canvasLines = (parseState.viewDraft.canvasLines ?? []).map((ln) => ({
      ...ln,
      id: resolve(ln.id),
    })) as CanvasLine[];

    const customCardTypes = (parseState.viewDraft.customCardTypes ?? []).map((ct) => ({
      ...ct,
      id: resolve(ct.id),
    })) as CustomCardType[];

    const viewId = parseState.viewDraft.id?.trim() ? resolve(parseState.viewDraft.id) : generateStormId();
    views.push(
      normalizeBoardView({
        id: viewId,
        name: parseState.viewDraft.name,
        modelingMode: parseState.viewDraft.modelingMode,
        workshopFormat: parseState.viewDraft.workshopFormat,
        facilitatorEnabled: parseState.viewDraft.facilitatorEnabled,
        facilitatorPhase: parseState.viewDraft.facilitatorPhase,
        elements,
        swimlanes,
        boundedContexts,
        relations,
        contextRelations,
        connectors,
        canvasLines,
        customCardTypes,
        timeline: parseState.viewDraft.timeline,
        viewport: parseState.viewDraft.viewport,
        snapToTimeline: parseState.viewDraft.snapToTimeline,
        snapToGrid: parseState.viewDraft.snapToGrid,
      }),
    );
    parseState.viewDraft = null;
    viewIdMap = new Map(globalIdMap);
    descPending.clear();
    metaPending.clear();
  };

  const startView = (cols: string[]) => {
    flushView();
    if (cols[3] === "actions") {
      parseState.viewDraft = {
        kind: "actions",
        id: cols[1] ?? generateStormId(),
        name: parseCell(cols[2] ?? "Maßnahmen"),
        config: { groupBy: "obligation" },
        items: [],
      };
      return;
    }
    const modelingMode = normalizeModelingMode(cols[3] ?? "eventStorming", cols[4]);
    const workshopFormat = normalizeWorkshopFormatForMode(cols[4] ?? "free", modelingMode);
    parseState.viewDraft = {
      kind: "canvas",
      id: cols[1] ?? generateStormId(),
      name: parseCell(cols[2] ?? "Board"),
      modelingMode,
      workshopFormat,
      facilitatorEnabled: cols[5] === "1",
      facilitatorPhase: num(cols[6] ?? "") ?? 0,
      elements: [],
      swimlanes: [],
      boundedContexts: [],
      relations: [],
      contextRelations: [],
      connectors: [],
      canvasLines: [],
      customCardTypes: [],
      timeline: defaultTimelineForModelingMode(modelingMode),
      viewport: { ...DEFAULT_VIEWPORT },
      snapToTimeline: modelingModeUsesTimelineByDefault(modelingMode),
      snapToGrid: false,
    };
    viewIdMap = new Map(globalIdMap);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("@")) {
      const cols = splitRow(trimmed);
      const tag = cols[0]?.slice(1);
      if (tag === "format" && cols[1] !== E2V_FORMAT) return null;
      if (tag === "title") {
        const rest = cols.slice(1).join(" ").trim();
        if (rest) title = parseCell(rest);
      }
      if (tag === "activeViewId") activeViewId = cols[1] ?? "";
      if (tag === "workshopMode") workshopMode = cols[1] === "1";
      if (tag === "appearance") {
        try {
          const json = trimmed.slice("@appearance".length).trim();
          appearance = normalizeAppearance(JSON.parse(json || "{}"));
        } catch {
          /* keep default */
        }
      }
      if (tag === "id" && cols[1] && cols[2]) {
        globalIdMap.set(cols[1], cols[2]);
        viewIdMap.set(cols[1], cols[2]);
      }
      if (tag === "view") startView(cols);
      if (tag === "avcfg" && parseState.viewDraft?.kind === "actions") {
        parseState.viewDraft.config.groupBy =
          cols[1] === "actionType" ? "actionType" : "obligation";
      }
      if (parseState.viewDraft?.kind === "actions") {
        if (tag === "avqinc" || tag === "avqexc") {
          parseState.viewDraft.config = applyE2vTagFilterLine(
            "avq",
            tag === "avqinc" ? "inc" : "exc",
            cols,
            parseState.viewDraft.config,
          );
        }
        if (tag === "atinc" || tag === "atexc") {
          parseState.viewDraft.config = applyE2vTagFilterLine(
            "at",
            tag === "atinc" ? "inc" : "exc",
            cols,
            parseState.viewDraft.config,
          );
        }
        if (tag === "stinc" || tag === "stexc") {
          parseState.viewDraft.config = applyE2vTagFilterLine(
            "st",
            tag === "stinc" ? "inc" : "exc",
            cols,
            parseState.viewDraft.config,
          );
        }
        // Legacy include-only rows
        if (tag === "avfq") {
          parseState.viewDraft.config = applyE2vTagFilterLine("avq", "inc", cols, parseState.viewDraft.config);
        }
        if (tag === "avfs") {
          parseState.viewDraft.config = applyE2vTagFilterLine("st", "inc", cols, parseState.viewDraft.config);
        }
        if (tag === "avft") {
          parseState.viewDraft.config = applyE2vTagFilterLine("at", "inc", cols, parseState.viewDraft.config);
        }
      }
      if (tag === "avq" && parseState.viewDraft?.kind === "actions") {
        parseState.viewDraft.config.searchQuery = parseCell(cols.slice(1).join(" "));
      }
      if (tag === "v" && parseState.viewDraft?.kind === "canvas") {
        parseState.viewDraft.viewport = {
          x: num(cols[1] ?? "") ?? 0,
          y: num(cols[2] ?? "") ?? 0,
          zoom: num(cols[3] ?? "") ?? 1,
        };
      }
      if (tag === "t" && parseState.viewDraft?.kind === "canvas") {
        const visCol = cols[3];
        parseState.viewDraft.timeline = {
          ...parseState.viewDraft.timeline,
          startLabel: parseCell(cols[1] ?? ""),
          endLabel: parseCell(cols[2] ?? ""),
          visible:
            visCol !== undefined && visCol !== ""
              ? visCol !== "0"
              : parseState.viewDraft.timeline.visible,
        };
      }
      if (tag === "snap" && parseState.viewDraft?.kind === "canvas") {
        parseState.viewDraft.snapToTimeline = cols[1] !== "0";
        parseState.viewDraft.snapToGrid = cols[2] === "1";
      }
      if (tag === "ct" && parseState.viewDraft?.kind === "canvas") {
        const ct: CustomCardType = {
          id: cols[1] ?? generateStormId(),
          name: parseCell(cols[2] ?? "Type"),
          fill: cols[3] ?? "#f1f5f9",
          stroke: cols[4] ?? "#94a3b8",
          ink: cols[5] ?? "#0f172a",
        };
        parseState.viewDraft.customCardTypes = [...(parseState.viewDraft.customCardTypes ?? []), ct];
      }
      if (tag === "desc" && cols[1]) {
        descPending.set(cols[1], parseCell(cols.slice(2).join(" ")));
      }
      if (tag === "meta" && cols[1]) {
        try {
          metaPending.set(cols[1], JSON.parse(cols.slice(2).join("\t") || "{}") as Record<string, unknown>);
        } catch {
          /* skip invalid meta */
        }
      }
      if (tag === "endview") flushView();
      continue;
    }

    const cols = splitRow(trimmed);
    const kind = cols[0];
    if (kind === "g") {
      glossary.push({
        term: parseCell(cols[1] ?? ""),
        definition: parseCell(cols.slice(2).join(" ")),
      });
      continue;
    }
    if (kind === "ai") {
      actionItemsRaw.push({
        id: cols[1],
        title: parseCell(cols[2] ?? ""),
        status: cols[3],
        area: cols[4],
        notes: parseCell(cols[5] ?? ""),
        elementId: cols[6] || undefined,
        boundedContextId: cols[7] || undefined,
      });
      continue;
    }

    if (!parseState.viewDraft) continue;

    if (kind === "am" && parseState.viewDraft.kind === "actions") {
      const qualities = (cols[9] ?? "")
        .split(",")
        .map((q) => q.trim())
        .filter(Boolean);
      const targetViewId = cols[10]?.trim();
      const targetElementId = cols[11]?.trim();
      const item = normalizeMeasureActionItem({
        id: cols[1],
        title: parseCell(cols[2] ?? ""),
        actionType: cols[3] as MeasureActionItem["actionType"],
        obligation: cols[4] as MeasureActionItem["obligation"],
        status: cols[5] as MeasureActionItem["status"],
        effort: (cols[6] || undefined) as MeasureActionItem["effort"],
        owner: cols[7] || undefined,
        description: parseCell(cols[8] ?? "") || undefined,
        qualities: qualities as MeasureActionItem["qualities"],
        targetRef:
          targetViewId && targetElementId
            ? {
                viewId: targetViewId,
                elementId: targetElementId,
                elementLabel: parseCell(cols[12] ?? "") || targetElementId,
              }
            : undefined,
        createdAt: cols[13],
        updatedAt: cols[14],
      });
      parseState.viewDraft.items = [...parseState.viewDraft.items, item];
      continue;
    }

    if (parseState.viewDraft.kind !== "canvas") continue;

    if (kind === "s") {
      parseState.viewDraft.swimlanes = [
        ...(parseState.viewDraft.swimlanes ?? []),
        {
          id: cols[1] ?? generateStormId(),
          label: parseCell(cols[2] ?? ""),
          x: num(cols[3] ?? "") ?? 0,
          y: num(cols[4] ?? "") ?? 0,
          width: num(cols[5] ?? "") ?? 100,
          height: num(cols[6] ?? "") ?? 100,
          color: cols[7] || undefined,
          fillOpacity: num(cols[8] ?? ""),
          borderColor: cols[9] || undefined,
          borderOpacity: num(cols[10] ?? ""),
          locked: cols[11] === "1",
        },
      ];
    } else if (kind === "b") {
      parseState.viewDraft.boundedContexts = [
        ...(parseState.viewDraft.boundedContexts ?? []),
        {
          id: cols[1] ?? generateStormId(),
          label: parseCell(cols[2] ?? ""),
          x: num(cols[3] ?? "") ?? 0,
          y: num(cols[4] ?? "") ?? 0,
          width: num(cols[5] ?? "") ?? 100,
          height: num(cols[6] ?? "") ?? 100,
          purpose: parseCell(cols[7] ?? "") || undefined,
          detailViewId: cols[8] || undefined,
          color: cols[9] || undefined,
          fillOpacity: num(cols[10] ?? ""),
          borderColor: cols[11] || undefined,
          borderOpacity: num(cols[12] ?? ""),
          locked: cols[13] === "1",
        },
      ];
    } else if (kind === "e") {
      parseState.viewDraft.elements = [
        ...(parseState.viewDraft.elements ?? []),
        {
          id: cols[1] ?? generateStormId(),
          type: normalizeE2vElementType(cols[2] ?? ""),
          x: num(cols[3] ?? "") ?? 0,
          y: num(cols[4] ?? "") ?? 0,
          width: num(cols[5] ?? ""),
          height: num(cols[6] ?? ""),
          rotation: num(cols[7] ?? ""),
          zIndex: num(cols[8] ?? ""),
          swimlaneId: optionalIdCell(cols[9]),
          boundedContextId: optionalIdCell(cols[10]),
          aggregateId: optionalIdCell(cols[11]),
          subdomainId: optionalIdCell(cols[12]),
          detailViewId: optionalIdCell(cols[13]),
          label: parseCell(cols[14] ?? ""),
        },
      ];
    } else if (kind === "r") {
      const relation =
        cols.length >= 5 && isE2vRelationType(cols[2] ?? "")
          ? {
              id: cols[1] ?? generateStormId(),
              type: cols[2] as StormRelation["type"],
              sourceId: cols[3] ?? "",
              targetId: cols[4] ?? "",
              label: parseCell(cols[5] ?? "") || undefined,
              labelMode: (cols[6] as StormRelation["labelMode"]) || undefined,
              strokeStyle: (cols[7] as StormRelation["strokeStyle"]) || undefined,
              progressMark: (cols[8] as StormRelation["progressMark"]) || undefined,
            }
          : {
              id: generateStormId(),
              type: "triggers" as StormRelation["type"],
              sourceId: cols[1] ?? "",
              targetId: cols[2] ?? "",
            };
      parseState.viewDraft.relations = [...(parseState.viewDraft.relations ?? []), relation];
    } else if (kind === "cr") {
      parseState.viewDraft.contextRelations = [
        ...(parseState.viewDraft.contextRelations ?? []),
        {
          id: cols[1] ?? generateStormId(),
          type: cols[2] as ContextRelation["type"],
          sourceContextId: cols[3] ?? "",
          targetContextId: cols[4] ?? "",
          label: parseCell(cols[5] ?? "") || undefined,
        },
      ];
    } else if (kind === "cn") {
      const shorthand =
        cols.length === 3 &&
        (cols[1]?.includes(":") ?? false) &&
        (cols[2]?.includes(":") ?? false);
      const connector = shorthand
        ? {
            id: generateStormId(),
            source: parseEndpoint(cols[1] ?? "", viewIdMap),
            target: parseEndpoint(cols[2] ?? "", viewIdMap),
          }
        : {
            id: cols[1] ?? generateStormId(),
            source: parseEndpoint(cols[2] ?? "", viewIdMap),
            target: parseEndpoint(cols[3] ?? "", viewIdMap),
            arrowHead: (cols[4] as BoardConnector["arrowHead"]) || undefined,
            relationType: (cols[5] as BoardConnector["relationType"]) || undefined,
            contextMapPattern: (cols[6] as BoardConnector["contextMapPattern"]) || undefined,
            strokeStyle: (cols[7] as BoardConnector["strokeStyle"]) || undefined,
            color: cols[8] || undefined,
            label: parseCell(cols[9] ?? "") || undefined,
            labelMode: (cols[10] as BoardConnector["labelMode"]) || undefined,
            progressMark: (cols[11] as BoardConnector["progressMark"]) || undefined,
          };
      parseState.viewDraft.connectors = [...(parseState.viewDraft.connectors ?? []), connector];
    } else if (kind === "ln") {
      parseState.viewDraft.canvasLines = [
        ...(parseState.viewDraft.canvasLines ?? []),
        {
          id: cols[1] ?? generateStormId(),
          x1: num(cols[2] ?? "") ?? 0,
          y1: num(cols[3] ?? "") ?? 0,
          x2: num(cols[4] ?? "") ?? 0,
          y2: num(cols[5] ?? "") ?? 0,
          arrowHead: (cols[6] as CanvasLine["arrowHead"]) || undefined,
          strokeStyle: (cols[7] as CanvasLine["strokeStyle"]) || undefined,
          color: cols[8] || undefined,
          label: parseCell(cols[9] ?? "") || undefined,
        },
      ];
    }
  }

  flushView();
  if (views.length === 0) return null;

  const doc = normalizeBoardDocument({
    title,
    glossary,
    actionItems: normalizeActionItems(actionItemsRaw),
    appearance,
    workshopMode,
    activeViewId: activeViewId || views[0]!.id,
    views,
  });

  return doc;
}

export function boardImportPayloadFromE2vText(text: string): BoardImportPayload | null {
  return decodeE2vText(text);
}
