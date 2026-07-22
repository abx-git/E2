import type { BoardView } from "@/lib/storm-json";
import { createEmptyBoardView, normalizeBoardView } from "@/lib/storm-json";
import { generateStormId } from "@/lib/storm-id";
import { defaultPaletteTypeForMode } from "@/types/storm-element";
import type {
  ModelingMode,
  StormElement,
  Swimlane,
  BoundedContext,
  Timeline,
  Viewport,
  WorkshopFormat,
  GlossaryEntry,
} from "@/types/storm-element";
import type { ContextRelation, StormRelation } from "@/types/storm-relation";
import type { BoardAppearance } from "@/lib/board-appearance";

/** Flat canvas fields mirrored from the active view. */
export interface ActiveViewFlatState {
  modelingMode: ModelingMode;
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
  snapToTimeline: boolean;
  snapToGrid: boolean;
}

export interface ViewDocumentState extends ActiveViewFlatState {
  title: string;
  glossary: GlossaryEntry[];
  appearance: BoardAppearance;
  workshopMode: boolean;
  activeViewId: string;
  views: BoardView[];
}

export function flatFieldsFromView(view: BoardView): ActiveViewFlatState {
  return {
    modelingMode: view.modelingMode,
    workshopFormat: view.workshopFormat,
    facilitatorEnabled: view.facilitatorEnabled,
    facilitatorPhase: view.facilitatorPhase,
    elements: view.elements,
    relations: view.relations,
    contextRelations: view.contextRelations,
    swimlanes: view.swimlanes,
    boundedContexts: view.boundedContexts,
    timeline: view.timeline,
    viewport: view.viewport,
    snapToTimeline: view.snapToTimeline,
    snapToGrid: view.snapToGrid,
  };
}

export function viewFromFlat(
  id: string,
  name: string,
  flat: ActiveViewFlatState,
): BoardView {
  return normalizeBoardView({
    id,
    name,
    ...flat,
  });
}

/** Write current flat canvas fields back into the active entry of `views`. */
export function flushActiveViewIntoViews(state: ViewDocumentState): BoardView[] {
  return state.views.map((v) =>
    v.id === state.activeViewId
      ? viewFromFlat(v.id, v.name, state)
      : v,
  );
}

export function resolveActiveView(
  views: BoardView[],
  activeViewId: string,
): BoardView {
  return views.find((v) => v.id === activeViewId) ?? views[0]!;
}

export function applyViewToFlatPatch(view: BoardView): ActiveViewFlatState & {
  paletteType: ReturnType<typeof defaultPaletteTypeForMode>;
} {
  return {
    ...flatFieldsFromView(view),
    paletteType: defaultPaletteTypeForMode(view.modelingMode),
  };
}

export function createInitialViewDocument(title: string): {
  activeViewId: string;
  views: BoardView[];
} & ActiveViewFlatState {
  const id = generateStormId();
  const view = createEmptyBoardView({ id, name: "Board" });
  return {
    activeViewId: id,
    views: [view],
    ...flatFieldsFromView(view),
  };
}

export const CLEAR_SELECTION_PATCH = {
  selectedElementIds: [] as string[],
  selectedRelationId: null as string | null,
  selectedContextRelationId: null as string | null,
  selectedBoundedContextId: null as string | null,
  selectedSwimlaneId: null as string | null,
  relationMode: false,
  relationDraftSourceId: null as string | null,
  contextMapMode: false,
  contextMapDraftSourceId: null as string | null,
  contextMenu: null,
};
