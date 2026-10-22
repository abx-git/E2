import { normalizeAppearance } from "@/lib/board-appearance";
import { normalizeActionItems } from "@/lib/action-items";
import type { BoardImportPayload, BoardView } from "@/lib/storm-json";
import {
  normalizeBoardDocument,
  normalizeBoardView,
  normalizeStormElement,
} from "@/lib/storm-json";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";
import { generateStormId } from "@/lib/storm-id";
import type { BoardConnector, ConnectorEndpoint } from "@/types/board-connector";
import type { CanvasLine } from "@/types/canvas-annotation";
import type { CustomCardType } from "@/lib/custom-card-types";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import type {
  GlossaryEntry,
  ModelingMode,
  StormElement,
  Timeline,
  Viewport,
  WorkshopFormat,
} from "@/types/storm-element";

/** Mutable parse buffer for one `@view` … `@endview` block. */
interface E2vViewDraft {
  id: string;
  name: string;
  modelingMode: ModelingMode;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  swimlanes: BoardView["swimlanes"];
  boundedContexts: BoardView["boundedContexts"];
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
import { parseCell, splitRow } from "@/lib/e2v/text";

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
  const parseState = { viewDraft: null as E2vViewDraft | null };
  let viewIdMap = new Map<string, string>();
  const descPending = new Map<string, string>();
  const metaPending = new Map<string, Record<string, unknown>>();

  const flushView = () => {
    if (!parseState.viewDraft) return;
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
    parseState.viewDraft = {
      id: cols[1] ?? generateStormId(),
      name: parseCell(cols[2] ?? "Board"),
      modelingMode: (cols[3] ?? "eventStorming") as ModelingMode,
      workshopFormat: (cols[4] ?? "free") as WorkshopFormat,
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
      timeline: { ...DEFAULT_TIMELINE },
      viewport: { ...DEFAULT_VIEWPORT },
      snapToTimeline: true,
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
      if (tag === "title") title = parseCell(cols[1] ?? title);
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
      if (tag === "v" && parseState.viewDraft) {
        parseState.viewDraft.viewport = {
          x: num(cols[1] ?? "") ?? 0,
          y: num(cols[2] ?? "") ?? 0,
          zoom: num(cols[3] ?? "") ?? 1,
        };
      }
      if (tag === "t" && parseState.viewDraft) {
        parseState.viewDraft.timeline = {
          ...DEFAULT_TIMELINE,
          ...parseState.viewDraft.timeline,
          startLabel: parseCell(cols[1] ?? ""),
          endLabel: parseCell(cols[2] ?? ""),
          visible: cols[3] !== "0",
        };
      }
      if (tag === "snap" && parseState.viewDraft) {
        parseState.viewDraft.snapToTimeline = cols[1] !== "0";
        parseState.viewDraft.snapToGrid = cols[2] === "1";
      }
      if (tag === "ct" && parseState.viewDraft) {
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
        descPending.set(cols[1], parseCell(cols.slice(2).join("\t")));
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
      glossary.push({ term: parseCell(cols[1] ?? ""), definition: parseCell(cols[2] ?? "") });
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
          type: cols[2] as StormElement["type"],
          x: num(cols[3] ?? "") ?? 0,
          y: num(cols[4] ?? "") ?? 0,
          width: num(cols[5] ?? ""),
          height: num(cols[6] ?? ""),
          rotation: num(cols[7] ?? ""),
          zIndex: num(cols[8] ?? ""),
          swimlaneId: cols[9] || undefined,
          boundedContextId: cols[10] || undefined,
          aggregateId: cols[11] || undefined,
          subdomainId: cols[12] || undefined,
          detailViewId: cols[13] || undefined,
          label: parseCell(cols[14] ?? ""),
        },
      ];
    } else if (kind === "r") {
      parseState.viewDraft.relations = [
        ...(parseState.viewDraft.relations ?? []),
        {
          id: cols[1] ?? generateStormId(),
          type: cols[2] as StormRelation["type"],
          sourceId: cols[3] ?? "",
          targetId: cols[4] ?? "",
          label: parseCell(cols[5] ?? "") || undefined,
          labelMode: (cols[6] as StormRelation["labelMode"]) || undefined,
          strokeStyle: (cols[7] as StormRelation["strokeStyle"]) || undefined,
          progressMark: (cols[8] as StormRelation["progressMark"]) || undefined,
        },
      ];
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
      parseState.viewDraft.connectors = [
        ...(parseState.viewDraft.connectors ?? []),
        {
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
        },
      ];
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
