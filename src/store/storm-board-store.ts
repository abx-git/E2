import { create } from "zustand";

import { elementDimensions, defaultLabelForType } from "@/lib/element-styles";
import { defaultRelationType } from "@/lib/relation-validation";
import { generateStormId } from "@/lib/storm-id";
import type { BoardImportPayload } from "@/lib/storm-json";
import {
  DEFAULT_APPEARANCE,
  type BoardAppearance,
} from "@/lib/board-appearance";
import {
  type BoardDomainSnapshot,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/board-history";
import type {
  BoundedContext,
  ElementType,
  GlossaryEntry,
  StormElement,
  Swimlane,
  Timeline,
  Viewport,
  WorkshopFormat,
} from "@/types/storm-element";
import { DEFAULT_TIMELINE, DEFAULT_VIEWPORT } from "@/types/storm-element";
import type {
  ContextMapPattern,
  ContextRelation,
  RelationType,
  StormRelation,
} from "@/types/storm-relation";
import type { ContextMenuState, ContextMenuTarget } from "@/types/context-menu";

export interface StormBoardState {
  title: string;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  contextRelations: ContextRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  snapToTimeline: boolean;
  snapToGrid: boolean;
  selectedElementIds: string[];
  selectedRelationId: string | null;
  selectedContextRelationId: string | null;
  selectedBoundedContextId: string | null;
  selectedSwimlaneId: string | null;
  paletteType: ElementType;
  relationMode: boolean;
  relationDraftSourceId: string | null;
  contextMapMode: boolean;
  contextMapDraftSourceId: string | null;
  contextMenu: ContextMenuState | null;

  /** Undo stacks (not persisted). */
  past: BoardDomainSnapshot[];
  future: BoardDomainSnapshot[];
  gestureActive: boolean;
  gestureSnapshotTaken: boolean;

  setTitle: (title: string) => void;
  setWorkshopFormat: (format: WorkshopFormat) => void;
  setFacilitatorEnabled: (enabled: boolean) => void;
  setFacilitatorPhase: (phase: number) => void;
  nextFacilitatorPhase: () => void;
  prevFacilitatorPhase: () => void;
  setViewport: (viewport: Viewport) => void;
  setSnapToTimeline: (v: boolean) => void;
  setSnapToGrid: (v: boolean) => void;
  setAppearance: (patch: Partial<BoardAppearance>) => void;
  setPaletteType: (type: ElementType) => void;
  selectElement: (id: string | null, additive?: boolean) => void;
  setSelectedElementIds: (ids: string[], additive?: boolean) => void;
  selectRelation: (id: string | null) => void;
  selectContextRelation: (id: string | null) => void;
  selectBoundedContext: (id: string | null) => void;
  selectSwimlane: (id: string | null) => void;
  clearSelection: () => void;
  openContextMenu: (x: number, y: number, target: ContextMenuTarget) => void;
  closeContextMenu: () => void;

  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addElement: (type: ElementType, x: number, y: number, label?: string) => string;
  updateElement: (id: string, patch: Partial<StormElement>) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  moveElements: (updates: Array<{ id: string; x: number; y: number }>) => void;
  patchElements: (
    updates: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>,
  ) => void;

  addRelation: (sourceId: string, targetId: string, type?: RelationType, label?: string) => string | null;
  updateRelation: (id: string, patch: Partial<StormRelation>) => void;
  deleteRelation: (id: string) => void;
  setRelationMode: (enabled: boolean) => void;
  setRelationDraftSource: (id: string | null) => void;
  connectElements: (sourceId: string, targetId: string) => string | null;

  addContextRelation: (
    sourceContextId: string,
    targetContextId: string,
    type?: ContextMapPattern,
    label?: string,
  ) => string | null;
  updateContextRelation: (id: string, patch: Partial<ContextRelation>) => void;
  deleteContextRelation: (id: string) => void;
  setContextMapMode: (enabled: boolean) => void;
  setContextMapDraftSource: (id: string | null) => void;
  connectBoundedContexts: (sourceContextId: string, targetContextId: string) => string | null;

  addSwimlane: (label?: string) => string;
  updateSwimlane: (id: string, patch: Partial<Swimlane>) => void;
  deleteSwimlane: (id: string) => void;

  addBoundedContext: (x: number, y: number, width: number, height: number, label?: string) => string;
  updateBoundedContext: (id: string, patch: Partial<BoundedContext>) => void;
  deleteBoundedContext: (id: string) => void;

  setTimeline: (timeline: Partial<Timeline>) => void;
  addGlossaryEntry: (term: string, definition: string) => void;
  updateGlossaryEntry: (term: string, definition: string) => void;
  deleteGlossaryEntry: (term: string) => void;

  replaceBoardFromImport: (payload: BoardImportPayload) => void;
}

function createElement(type: ElementType, x: number, y: number, label?: string): StormElement {
  const dims = elementDimensions(type);
  return {
    id: generateStormId(),
    type,
    label: label ?? defaultLabelForType(type),
    x,
    y,
    width: dims.width,
    height: dims.height,
    rotation: type === "hotspot" ? 45 : undefined,
    metadata: type === "hotspot"
      ? { hotspotStatus: "open", hotspotPriority: "medium" }
      : type === "note"
        ? { noteColor: "cream" }
        : undefined,
  };
}

function captureDomain(s: StormBoardState): BoardDomainSnapshot {
  return {
    title: s.title,
    workshopFormat: s.workshopFormat,
    facilitatorEnabled: s.facilitatorEnabled,
    facilitatorPhase: s.facilitatorPhase,
    elements: s.elements,
    relations: s.relations,
    contextRelations: s.contextRelations,
    swimlanes: s.swimlanes,
    boundedContexts: s.boundedContexts,
    timeline: s.timeline,
    glossary: s.glossary,
    appearance: s.appearance,
    snapToTimeline: s.snapToTimeline,
    snapToGrid: s.snapToGrid,
  };
}

function domainPatch(snap: BoardDomainSnapshot): Partial<StormBoardState> {
  return {
    title: snap.title,
    workshopFormat: snap.workshopFormat,
    facilitatorEnabled: snap.facilitatorEnabled,
    facilitatorPhase: snap.facilitatorPhase,
    elements: snap.elements,
    relations: snap.relations,
    contextRelations: snap.contextRelations,
    swimlanes: snap.swimlanes,
    boundedContexts: snap.boundedContexts,
    timeline: snap.timeline,
    glossary: snap.glossary,
    appearance: snap.appearance,
    snapToTimeline: snap.snapToTimeline,
    snapToGrid: snap.snapToGrid,
  };
}

type SetFn = (
  partial:
    | Partial<StormBoardState>
    | ((state: StormBoardState) => Partial<StormBoardState> | StormBoardState),
) => void;
type GetFn = () => StormBoardState;

/** Apply a domain mutation, pushing history once (or once per gesture). */
function commit(
  set: SetFn,
  get: GetFn,
  updater: (s: StormBoardState) => Partial<StormBoardState>,
): void {
  const s = get();
  const needsPush = !s.gestureActive || !s.gestureSnapshotTaken;
  if (needsPush) {
    const past = pushHistory(s.past, captureDomain(s));
    const patch = updater(s);
    set({
      ...patch,
      past,
      future: [],
      gestureSnapshotTaken: s.gestureActive ? true : s.gestureSnapshotTaken,
    });
  } else {
    set(updater(s));
  }
}

export const useStormBoardStore = create<StormBoardState>((set, get) => ({
  title: "Neues Event Storming Board",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [],
  relations: [],
  contextRelations: [],
  swimlanes: [],
  boundedContexts: [],
  timeline: { ...DEFAULT_TIMELINE },
  viewport: { ...DEFAULT_VIEWPORT },
  glossary: [],
  appearance: { ...DEFAULT_APPEARANCE },
  snapToTimeline: true,
  snapToGrid: false,
  selectedElementIds: [],
  selectedRelationId: null,
  selectedContextRelationId: null,
  selectedBoundedContextId: null,
  selectedSwimlaneId: null,
  paletteType: "domainEvent",
  relationMode: false,
  relationDraftSourceId: null,
  contextMapMode: false,
  contextMapDraftSourceId: null,
  contextMenu: null,
  past: [],
  future: [],
  gestureActive: false,
  gestureSnapshotTaken: false,

  setTitle: (title) => commit(set, get, () => ({ title })),
  setWorkshopFormat: (workshopFormat) =>
    commit(set, get, () => ({ workshopFormat, facilitatorPhase: 0 })),
  setFacilitatorEnabled: (facilitatorEnabled) =>
    commit(set, get, () => ({ facilitatorEnabled })),
  setFacilitatorPhase: (facilitatorPhase) => commit(set, get, () => ({ facilitatorPhase })),
  nextFacilitatorPhase: () =>
    commit(set, get, (s) => ({ facilitatorPhase: s.facilitatorPhase + 1 })),
  prevFacilitatorPhase: () =>
    commit(set, get, (s) => ({ facilitatorPhase: Math.max(0, s.facilitatorPhase - 1) })),
  setViewport: (viewport) => set({ viewport }),
  setSnapToTimeline: (snapToTimeline) => commit(set, get, () => ({ snapToTimeline })),
  setSnapToGrid: (snapToGrid) => commit(set, get, () => ({ snapToGrid })),
  setAppearance: (patch) =>
    commit(set, get, (s) => ({ appearance: { ...s.appearance, ...patch } })),
  setPaletteType: (paletteType) => set({ paletteType }),

  selectElement: (id, additive) =>
    set((s) => {
      if (!id) return { selectedElementIds: [], selectedRelationId: null };
      if (additive) {
        const exists = s.selectedElementIds.includes(id);
        return {
          selectedElementIds: exists
            ? s.selectedElementIds.filter((x) => x !== id)
            : [...s.selectedElementIds, id],
          selectedRelationId: null,
          selectedContextRelationId: null,
          selectedBoundedContextId: null,
          selectedSwimlaneId: null,
        };
      }
      return {
        selectedElementIds: [id],
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
      };
    }),

  setSelectedElementIds: (ids, additive) =>
    set((s) => {
      const next = additive
        ? Array.from(new Set([...s.selectedElementIds, ...ids]))
        : ids;
      return {
        selectedElementIds: next,
        selectedRelationId: null,
        selectedContextRelationId: null,
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
      };
    }),

  selectRelation: (id) =>
    set({
      selectedRelationId: id,
      selectedContextRelationId: null,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  selectContextRelation: (id) =>
    set({
      selectedContextRelationId: id,
      selectedRelationId: null,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  selectBoundedContext: (id) =>
    set({
      selectedBoundedContextId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedSwimlaneId: null,
    }),

  selectSwimlane: (id) =>
    set({
      selectedSwimlaneId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
    }),

  clearSelection: () =>
    set({
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  openContextMenu: (x, y, target) => set({ contextMenu: { x, y, target } }),
  closeContextMenu: () => set({ contextMenu: null }),

  beginGesture: () => set({ gestureActive: true, gestureSnapshotTaken: false }),
  endGesture: () => set({ gestureActive: false, gestureSnapshotTaken: false }),

  undo: () => {
    const s = get();
    const result = undoHistory(s.past, s.future, captureDomain(s));
    if (!result) return;
    set({
      ...domainPatch(result.restored),
      past: result.past,
      future: result.future,
      gestureActive: false,
      gestureSnapshotTaken: false,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    });
  },

  redo: () => {
    const s = get();
    const result = redoHistory(s.past, s.future, captureDomain(s));
    if (!result) return;
    set({
      ...domainPatch(result.restored),
      past: result.past,
      future: result.future,
      gestureActive: false,
      gestureSnapshotTaken: false,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addElement: (type, x, y, label) => {
    const el = createElement(type, x, y, label);
    commit(set, get, (s) => ({
      elements: [...s.elements, el],
      selectedElementIds: [el.id],
    }));
    return el.id;
  },

  updateElement: (id, patch) =>
    commit(set, get, (s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
    })),

  deleteElement: (id) =>
    commit(set, get, (s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      relations: s.relations.filter((r) => r.sourceId !== id && r.targetId !== id),
      selectedElementIds: s.selectedElementIds.filter((x) => x !== id),
    })),

  moveElement: (id, x, y) =>
    commit(set, get, (s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, x, y } : e)),
    })),

  moveElements: (updates) =>
    commit(set, get, (s) => {
      if (updates.length === 0) return {};
      const byId = new Map(updates.map((u) => [u.id, u]));
      return {
        elements: s.elements.map((e) => {
          const u = byId.get(e.id);
          return u ? { ...e, x: u.x, y: u.y } : e;
        }),
      };
    }),

  patchElements: (updates) =>
    commit(set, get, (s) => {
      if (updates.length === 0) return {};
      const byId = new Map(updates.map((u) => [u.id, u]));
      return {
        elements: s.elements.map((e) => {
          const u = byId.get(e.id);
          if (!u) return e;
          const { id: _id, ...patch } = u;
          return { ...e, ...patch, id: e.id };
        }),
      };
    }),

  addRelation: (sourceId, targetId, type, label) => {
    if (sourceId === targetId) return null;
    const exists = get().relations.some(
      (r) =>
        r.sourceId === sourceId &&
        r.targetId === targetId &&
        (type === undefined || r.type === type),
    );
    if (exists) return null;
    const rel: StormRelation = {
      id: generateStormId(),
      type: type ?? "triggers",
      sourceId,
      targetId,
      label,
    };
    commit(set, get, (s) => ({
      relations: [...s.relations, rel],
      relationDraftSourceId: null,
    }));
    return rel.id;
  },

  updateRelation: (id, patch) =>
    commit(set, get, (s) => ({
      relations: s.relations.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r)),
    })),

  deleteRelation: (id) =>
    commit(set, get, (s) => ({
      relations: s.relations.filter((r) => r.id !== id),
      selectedRelationId: s.selectedRelationId === id ? null : s.selectedRelationId,
    })),

  setRelationMode: (relationMode) =>
    set({
      relationMode,
      relationDraftSourceId: relationMode ? get().relationDraftSourceId : null,
      contextMapMode: relationMode ? false : get().contextMapMode,
      contextMapDraftSourceId: relationMode ? null : get().contextMapDraftSourceId,
    }),

  setRelationDraftSource: (relationDraftSourceId) => set({ relationDraftSourceId }),

  connectElements: (sourceId, targetId) => {
    if (sourceId === targetId) return null;
    const src = get().elements.find((e) => e.id === sourceId);
    const tgt = get().elements.find((e) => e.id === targetId);
    if (!src || !tgt) return null;
    return get().addRelation(sourceId, targetId, defaultRelationType(src, tgt));
  },

  addContextRelation: (sourceContextId, targetContextId, type, label) => {
    if (sourceContextId === targetContextId) return null;
    const exists = get().contextRelations.some(
      (r) =>
        (r.sourceContextId === sourceContextId && r.targetContextId === targetContextId) ||
        (r.sourceContextId === targetContextId && r.targetContextId === sourceContextId),
    );
    if (exists) return null;
    const rel: ContextRelation = {
      id: generateStormId(),
      type: type ?? "customerSupplier",
      sourceContextId,
      targetContextId,
      label,
    };
    commit(set, get, (s) => ({
      contextRelations: [...s.contextRelations, rel],
      contextMapDraftSourceId: null,
      selectedContextRelationId: rel.id,
    }));
    return rel.id;
  },

  updateContextRelation: (id, patch) =>
    commit(set, get, (s) => ({
      contextRelations: s.contextRelations.map((r) =>
        r.id === id ? { ...r, ...patch, id: r.id } : r,
      ),
    })),

  deleteContextRelation: (id) =>
    commit(set, get, (s) => ({
      contextRelations: s.contextRelations.filter((r) => r.id !== id),
      selectedContextRelationId:
        s.selectedContextRelationId === id ? null : s.selectedContextRelationId,
    })),

  setContextMapMode: (contextMapMode) =>
    set({
      contextMapMode,
      contextMapDraftSourceId: contextMapMode ? get().contextMapDraftSourceId : null,
      relationMode: contextMapMode ? false : get().relationMode,
      relationDraftSourceId: contextMapMode ? null : get().relationDraftSourceId,
    }),

  setContextMapDraftSource: (contextMapDraftSourceId) => set({ contextMapDraftSourceId }),

  connectBoundedContexts: (sourceContextId, targetContextId) => {
    if (sourceContextId === targetContextId) return null;
    const src = get().boundedContexts.find((b) => b.id === sourceContextId);
    const tgt = get().boundedContexts.find((b) => b.id === targetContextId);
    if (!src || !tgt) return null;
    return get().addContextRelation(sourceContextId, targetContextId, "customerSupplier");
  },

  addSwimlane: (label) => {
    const id = generateStormId();
    const y = 120 + get().swimlanes.length * 180;
    const lane: Swimlane = {
      id,
      label: label ?? `Swimlane ${get().swimlanes.length + 1}`,
      x: 40,
      y,
      width: 1200,
      height: 160,
    };
    commit(set, get, (s) => ({
      swimlanes: [...s.swimlanes, lane],
      selectedSwimlaneId: id,
    }));
    return id;
  },

  updateSwimlane: (id, patch) =>
    commit(set, get, (s) => ({
      swimlanes: s.swimlanes.map((l) => (l.id === id ? { ...l, ...patch, id: l.id } : l)),
    })),

  deleteSwimlane: (id) =>
    commit(set, get, (s) => ({
      swimlanes: s.swimlanes.filter((l) => l.id !== id),
      elements: s.elements.map((e) =>
        e.swimlaneId === id ? { ...e, swimlaneId: undefined } : e,
      ),
      selectedSwimlaneId: s.selectedSwimlaneId === id ? null : s.selectedSwimlaneId,
    })),

  addBoundedContext: (x, y, width, height, label) => {
    const id = generateStormId();
    const bc: BoundedContext = {
      id,
      label: label ?? "Bounded Context",
      x,
      y,
      width,
      height,
      color: "#dbeafe",
    };
    commit(set, get, (s) => ({ boundedContexts: [...s.boundedContexts, bc] }));
    return id;
  },

  updateBoundedContext: (id, patch) =>
    commit(set, get, (s) => ({
      boundedContexts: s.boundedContexts.map((b) =>
        b.id === id ? { ...b, ...patch, id: b.id } : b,
      ),
    })),

  deleteBoundedContext: (id) =>
    commit(set, get, (s) => {
      const nextContextRelations = s.contextRelations.filter(
        (r) => r.sourceContextId !== id && r.targetContextId !== id,
      );
      return {
        boundedContexts: s.boundedContexts.filter((b) => b.id !== id),
        contextRelations: nextContextRelations,
        elements: s.elements.map((e) =>
          e.boundedContextId === id ? { ...e, boundedContextId: undefined } : e,
        ),
        selectedBoundedContextId:
          s.selectedBoundedContextId === id ? null : s.selectedBoundedContextId,
        selectedContextRelationId:
          s.selectedContextRelationId &&
          !nextContextRelations.some((r) => r.id === s.selectedContextRelationId)
            ? null
            : s.selectedContextRelationId,
      };
    }),

  setTimeline: (timeline) =>
    commit(set, get, (s) => ({ timeline: { ...s.timeline, ...timeline } })),

  addGlossaryEntry: (term, definition) =>
    commit(set, get, (s) => {
      if (s.glossary.some((g) => g.term === term)) return {};
      return { glossary: [...s.glossary, { term, definition }] };
    }),

  updateGlossaryEntry: (term, definition) =>
    commit(set, get, (s) => ({
      glossary: s.glossary.map((g) => (g.term === term ? { term, definition } : g)),
    })),

  deleteGlossaryEntry: (term) =>
    commit(set, get, (s) => ({ glossary: s.glossary.filter((g) => g.term !== term) })),

  replaceBoardFromImport: (payload) => {
    const s = get();
    const past = pushHistory(s.past, captureDomain(s));
    set({
      title: payload.title,
      workshopFormat: payload.workshopFormat,
      facilitatorEnabled: payload.facilitatorEnabled,
      facilitatorPhase: payload.facilitatorPhase,
      elements: payload.elements,
      relations: payload.relations,
      contextRelations: payload.contextRelations ?? [],
      swimlanes: payload.swimlanes,
      boundedContexts: payload.boundedContexts,
      timeline: payload.timeline,
      viewport: payload.viewport,
      glossary: payload.glossary,
      appearance: payload.appearance,
      snapToTimeline: payload.snapToTimeline,
      snapToGrid: payload.snapToGrid,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
      relationMode: false,
      relationDraftSourceId: null,
      contextMapMode: false,
      contextMapDraftSourceId: null,
      past,
      future: [],
      gestureActive: false,
      gestureSnapshotTaken: false,
    });
  },
}));

export function boardImportPayloadFromStore(): BoardImportPayload {
  const s = useStormBoardStore.getState();
  return {
    title: s.title,
    workshopFormat: s.workshopFormat,
    facilitatorEnabled: s.facilitatorEnabled,
    facilitatorPhase: s.facilitatorPhase,
    elements: s.elements,
    relations: s.relations,
    contextRelations: s.contextRelations,
    swimlanes: s.swimlanes,
    boundedContexts: s.boundedContexts,
    timeline: s.timeline,
    viewport: s.viewport,
    glossary: s.glossary,
    appearance: s.appearance,
    snapToTimeline: s.snapToTimeline,
    snapToGrid: s.snapToGrid,
  };
}
