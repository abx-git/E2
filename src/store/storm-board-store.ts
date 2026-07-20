import { create } from "zustand";

import { elementDimensions, defaultLabelForType } from "@/lib/element-styles";
import { defaultRelationType } from "@/lib/relation-validation";
import { generateStormId } from "@/lib/storm-id";
import type { BoardImportPayload } from "@/lib/storm-json";
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
import type { RelationType, StormRelation } from "@/types/storm-relation";

export interface StormBoardState {
  title: string;
  workshopFormat: WorkshopFormat;
  facilitatorEnabled: boolean;
  facilitatorPhase: number;
  elements: StormElement[];
  relations: StormRelation[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  timeline: Timeline;
  viewport: Viewport;
  glossary: GlossaryEntry[];
  snapToTimeline: boolean;
  snapToGrid: boolean;
  selectedElementIds: string[];
  selectedRelationId: string | null;
  selectedBoundedContextId: string | null;
  selectedSwimlaneId: string | null;
  paletteType: ElementType;
  relationMode: boolean;
  relationDraftSourceId: string | null;

  setTitle: (title: string) => void;
  setWorkshopFormat: (format: WorkshopFormat) => void;
  setFacilitatorEnabled: (enabled: boolean) => void;
  setFacilitatorPhase: (phase: number) => void;
  nextFacilitatorPhase: () => void;
  prevFacilitatorPhase: () => void;
  setViewport: (viewport: Viewport) => void;
  setSnapToTimeline: (v: boolean) => void;
  setSnapToGrid: (v: boolean) => void;
  setPaletteType: (type: ElementType) => void;
  selectElement: (id: string | null, additive?: boolean) => void;
  setSelectedElementIds: (ids: string[], additive?: boolean) => void;
  selectRelation: (id: string | null) => void;
  selectBoundedContext: (id: string | null) => void;
  selectSwimlane: (id: string | null) => void;
  clearSelection: () => void;

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
    metadata: type === "hotspot" ? { hotspotStatus: "open", hotspotPriority: "medium" } : undefined,
  };
}

export const useStormBoardStore = create<StormBoardState>((set, get) => ({
  title: "Neues Event Storming Board",
  workshopFormat: "free",
  facilitatorEnabled: false,
  facilitatorPhase: 0,
  elements: [],
  relations: [],
  swimlanes: [],
  boundedContexts: [],
  timeline: { ...DEFAULT_TIMELINE },
  viewport: { ...DEFAULT_VIEWPORT },
  glossary: [],
  snapToTimeline: true,
  snapToGrid: false,
  selectedElementIds: [],
  selectedRelationId: null,
  selectedBoundedContextId: null,
  selectedSwimlaneId: null,
  paletteType: "domainEvent",
  relationMode: false,
  relationDraftSourceId: null,

  setTitle: (title) => set({ title }),
  setWorkshopFormat: (workshopFormat) => set({ workshopFormat, facilitatorPhase: 0 }),
  setFacilitatorEnabled: (facilitatorEnabled) => set({ facilitatorEnabled }),
  setFacilitatorPhase: (facilitatorPhase) => set({ facilitatorPhase }),
  nextFacilitatorPhase: () => set((s) => ({ facilitatorPhase: s.facilitatorPhase + 1 })),
  prevFacilitatorPhase: () => set((s) => ({ facilitatorPhase: Math.max(0, s.facilitatorPhase - 1) })),
  setViewport: (viewport) => set({ viewport }),
  setSnapToTimeline: (snapToTimeline) => set({ snapToTimeline }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
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
          selectedBoundedContextId: null,
          selectedSwimlaneId: null,
        };
      }
      return {
        selectedElementIds: [id],
        selectedRelationId: null,
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
        selectedBoundedContextId: null,
        selectedSwimlaneId: null,
      };
    }),

  selectRelation: (id) =>
    set({
      selectedRelationId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  selectBoundedContext: (id) =>
    set({
      selectedBoundedContextId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedRelationId: null,
      selectedSwimlaneId: null,
    }),

  selectSwimlane: (id) =>
    set({
      selectedSwimlaneId: id,
      selectedElementIds: id ? [] : get().selectedElementIds,
      selectedRelationId: null,
      selectedBoundedContextId: null,
    }),

  clearSelection: () =>
    set({
      selectedElementIds: [],
      selectedRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
    }),

  addElement: (type, x, y, label) => {
    const el = createElement(type, x, y, label);
    set((s) => ({ elements: [...s.elements, el], selectedElementIds: [el.id] }));
    return el.id;
  },

  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
    })),

  deleteElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      relations: s.relations.filter((r) => r.sourceId !== id && r.targetId !== id),
      selectedElementIds: s.selectedElementIds.filter((x) => x !== id),
    })),

  moveElement: (id, x, y) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, x, y } : e)),
    })),

  moveElements: (updates) =>
    set((s) => {
      if (updates.length === 0) return s;
      const byId = new Map(updates.map((u) => [u.id, u]));
      return {
        elements: s.elements.map((e) => {
          const u = byId.get(e.id);
          return u ? { ...e, x: u.x, y: u.y } : e;
        }),
      };
    }),

  patchElements: (updates) =>
    set((s) => {
      if (updates.length === 0) return s;
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
    set((s) => ({ relations: [...s.relations, rel], relationDraftSourceId: null }));
    return rel.id;
  },

  updateRelation: (id, patch) =>
    set((s) => ({
      relations: s.relations.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r)),
    })),

  deleteRelation: (id) =>
    set((s) => ({
      relations: s.relations.filter((r) => r.id !== id),
      selectedRelationId: s.selectedRelationId === id ? null : s.selectedRelationId,
    })),

  setRelationMode: (relationMode) =>
    set({
      relationMode,
      relationDraftSourceId: relationMode ? get().relationDraftSourceId : null,
    }),

  setRelationDraftSource: (relationDraftSourceId) => set({ relationDraftSourceId }),

  connectElements: (sourceId, targetId) => {
    if (sourceId === targetId) return null;
    const src = get().elements.find((e) => e.id === sourceId);
    const tgt = get().elements.find((e) => e.id === targetId);
    if (!src || !tgt) return null;
    return get().addRelation(sourceId, targetId, defaultRelationType(src, tgt));
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
    set((s) => ({ swimlanes: [...s.swimlanes, lane], selectedSwimlaneId: id }));
    return id;
  },

  updateSwimlane: (id, patch) =>
    set((s) => ({
      swimlanes: s.swimlanes.map((l) => (l.id === id ? { ...l, ...patch, id: l.id } : l)),
    })),

  deleteSwimlane: (id) =>
    set((s) => ({
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
    set((s) => ({ boundedContexts: [...s.boundedContexts, bc] }));
    return id;
  },

  updateBoundedContext: (id, patch) =>
    set((s) => ({
      boundedContexts: s.boundedContexts.map((b) =>
        b.id === id ? { ...b, ...patch, id: b.id } : b,
      ),
    })),

  deleteBoundedContext: (id) =>
    set((s) => ({
      boundedContexts: s.boundedContexts.filter((b) => b.id !== id),
      elements: s.elements.map((e) =>
        e.boundedContextId === id ? { ...e, boundedContextId: undefined } : e,
      ),
      selectedBoundedContextId: s.selectedBoundedContextId === id ? null : s.selectedBoundedContextId,
    })),

  setTimeline: (timeline) => set((s) => ({ timeline: { ...s.timeline, ...timeline } })),

  addGlossaryEntry: (term, definition) =>
    set((s) => {
      if (s.glossary.some((g) => g.term === term)) return s;
      return { glossary: [...s.glossary, { term, definition }] };
    }),

  updateGlossaryEntry: (term, definition) =>
    set((s) => ({
      glossary: s.glossary.map((g) => (g.term === term ? { term, definition } : g)),
    })),

  deleteGlossaryEntry: (term) =>
    set((s) => ({ glossary: s.glossary.filter((g) => g.term !== term) })),

  replaceBoardFromImport: (payload) =>
    set({
      title: payload.title,
      workshopFormat: payload.workshopFormat,
      facilitatorEnabled: payload.facilitatorEnabled,
      facilitatorPhase: payload.facilitatorPhase,
      elements: payload.elements,
      relations: payload.relations,
      swimlanes: payload.swimlanes,
      boundedContexts: payload.boundedContexts,
      timeline: payload.timeline,
      viewport: payload.viewport,
      glossary: payload.glossary,
      snapToTimeline: payload.snapToTimeline,
      snapToGrid: payload.snapToGrid,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
      relationMode: false,
      relationDraftSourceId: null,
    }),
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
    swimlanes: s.swimlanes,
    boundedContexts: s.boundedContexts,
    timeline: s.timeline,
    viewport: s.viewport,
    glossary: s.glossary,
    snapToTimeline: s.snapToTimeline,
    snapToGrid: s.snapToGrid,
  };
}
