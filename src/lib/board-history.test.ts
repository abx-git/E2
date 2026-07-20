import { beforeEach, describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  type BoardDomainSnapshot,
  cloneDomainSnapshot,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/board-history";
import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import { DEFAULT_TIMELINE } from "@/types/storm-element";
import { useStormBoardStore } from "@/store/storm-board-store";

function emptyDomain(overrides: Partial<BoardDomainSnapshot> = {}): BoardDomainSnapshot {
  return {
    title: "Board",
    workshopFormat: "free",
    facilitatorEnabled: false,
    facilitatorPhase: 0,
    elements: [],
    relations: [],
    contextRelations: [],
    swimlanes: [],
    boundedContexts: [],
    timeline: { ...DEFAULT_TIMELINE },
    glossary: [],
    appearance: { ...DEFAULT_APPEARANCE },
    snapToTimeline: true,
    snapToGrid: false,
    ...overrides,
  };
}

describe("board-history", () => {
  it("push, undo, redo round-trip", () => {
    const a = emptyDomain({ title: "A" });
    const b = emptyDomain({ title: "B" });
    const past = pushHistory([], a);
    expect(past).toHaveLength(1);

    const undone = undoHistory(past, [], b);
    expect(undone).not.toBeNull();
    expect(undone!.restored.title).toBe("A");
    expect(undone!.future).toHaveLength(1);
    expect(undone!.future[0]!.title).toBe("B");

    const redone = redoHistory(undone!.past, undone!.future, undone!.restored);
    expect(redone).not.toBeNull();
    expect(redone!.restored.title).toBe("B");
  });

  it("respects history limit", () => {
    let past: BoardDomainSnapshot[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      past = pushHistory(past, emptyDomain({ title: `t${i}` }));
    }
    expect(past).toHaveLength(HISTORY_LIMIT);
    expect(past[0]!.title).toBe("t10");
  });

  it("cloneDomainSnapshot deep-clones", () => {
    const snap = emptyDomain({
      elements: [
        {
          id: "e1",
          type: "domainEvent",
          label: "X",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
        },
      ],
    });
    const cloned = cloneDomainSnapshot(snap);
    cloned.elements[0]!.label = "Y";
    expect(snap.elements[0]!.label).toBe("X");
  });
});

describe("store undo / import", () => {
  beforeEach(() => {
    useStormBoardStore.setState({
      title: "Start",
      workshopFormat: "free",
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [],
      relations: [],
      contextRelations: [],
      swimlanes: [],
      boundedContexts: [],
      timeline: { ...DEFAULT_TIMELINE },
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      snapToTimeline: true,
      snapToGrid: false,
      past: [],
      future: [],
      gestureActive: false,
      gestureSnapshotTaken: false,
      selectedElementIds: [],
      selectedRelationId: null,
      selectedContextRelationId: null,
      selectedBoundedContextId: null,
      selectedSwimlaneId: null,
      relationMode: false,
      relationDraftSourceId: null,
      contextMapMode: false,
      contextMapDraftSourceId: null,
    });
  });

  it("coalesces moves inside a gesture into one undo step", () => {
    const store = useStormBoardStore.getState();
    const id = store.addElement("domainEvent", 10, 20);
    expect(useStormBoardStore.getState().past).toHaveLength(1);

    store.beginGesture();
    store.moveElement(id, 30, 40);
    store.moveElement(id, 50, 60);
    store.endGesture();

    expect(useStormBoardStore.getState().past).toHaveLength(2);
    expect(useStormBoardStore.getState().elements[0]!.x).toBe(50);

    store.undo();
    expect(useStormBoardStore.getState().elements[0]!.x).toBe(10);
  });

  it("import undo restores previous board", () => {
    const store = useStormBoardStore.getState();
    store.addElement("command", 1, 2);
    const beforeTitle = useStormBoardStore.getState().title;

    store.replaceBoardFromImport({
      title: "Imported",
      workshopFormat: "free",
      facilitatorEnabled: false,
      facilitatorPhase: 0,
      elements: [],
      relations: [],
      contextRelations: [],
      swimlanes: [],
      boundedContexts: [],
      timeline: { ...DEFAULT_TIMELINE },
      viewport: { x: 0, y: 0, zoom: 1 },
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      snapToTimeline: true,
      snapToGrid: false,
    });

    expect(useStormBoardStore.getState().title).toBe("Imported");
    expect(useStormBoardStore.getState().elements).toHaveLength(0);

    store.undo();
    expect(useStormBoardStore.getState().title).toBe(beforeTitle);
    expect(useStormBoardStore.getState().elements).toHaveLength(1);
  });
});
