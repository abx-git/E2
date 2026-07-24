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
import { createEmptyBoardView } from "@/lib/storm-json";
import { boardImportPayloadFromStore, useStormBoardStore } from "@/store/storm-board-store";

function emptyDomain(overrides: Partial<BoardDomainSnapshot> = {}): BoardDomainSnapshot {
  const view = createEmptyBoardView({ id: "v1", name: "Board" });
  return {
    title: "Board",
    glossary: [],
    appearance: { ...DEFAULT_APPEARANCE },
    workshopMode: false,
    activeViewId: view.id,
    views: [view],
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
      views: [
        createEmptyBoardView({
          id: "v1",
          name: "Board",
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
        }),
      ],
    });
    const cloned = cloneDomainSnapshot(snap);
    cloned.views[0]!.elements[0]!.label = "Y";
    expect(snap.views[0]!.elements[0]!.label).toBe("X");
  });
});

describe("store undo / views / import", () => {
  beforeEach(() => {
    const store = useStormBoardStore.getState();
    store.replaceBoardFromImport({
      title: "Start",
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      workshopMode: false,
      activeViewId: "v1",
      views: [createEmptyBoardView({ id: "v1", name: "Board" })],
    });
    useStormBoardStore.setState({ past: [], future: [], clipboard: null });
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
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      workshopMode: false,
      activeViewId: "v2",
      views: [createEmptyBoardView({ id: "v2", name: "Board" })],
    });

    expect(useStormBoardStore.getState().title).toBe("Imported");
    expect(useStormBoardStore.getState().elements).toHaveLength(0);

    store.undo();
    expect(useStormBoardStore.getState().title).toBe(beforeTitle);
    expect(useStormBoardStore.getState().elements).toHaveLength(1);
  });

  it("switches views and preserves content per tab", () => {
    const store = useStormBoardStore.getState();
    store.addElement("domainEvent", 5, 5);
    const firstId = useStormBoardStore.getState().activeViewId;
    const secondId = store.addView("Prozess");
    expect(useStormBoardStore.getState().elements).toHaveLength(0);

    store.addElement("command", 9, 9);
    store.setActiveView(firstId);
    expect(useStormBoardStore.getState().elements).toHaveLength(1);
    expect(useStormBoardStore.getState().elements[0]!.type).toBe("domainEvent");

    store.setActiveView(secondId);
    expect(useStormBoardStore.getState().elements[0]!.type).toBe("command");
    expect(useStormBoardStore.getState().views).toHaveLength(2);
  });

  it("persists workshopMode on the document", () => {
    const store = useStormBoardStore.getState();
    store.setWorkshopMode(true);
    expect(useStormBoardStore.getState().workshopMode).toBe(true);
    expect(boardImportPayloadFromStore().workshopMode).toBe(true);
  });

  it("imports another document as new views without replacing globals", () => {
    const store = useStormBoardStore.getState();
    store.setTitle("Offen");
    store.setAppearance({ canvas: "#112233" });
    store.addGlossaryEntry("Lokal", "bleibt");
    store.setWorkshopMode(false);
    store.addElement("domainEvent", 1, 1);

    const result = store.importDocumentAsNewViews({
      title: "Fremd",
      glossary: [{ term: "Fremd", definition: "nein" }],
      appearance: { ...DEFAULT_APPEARANCE, canvas: "#ff00aa" },
      workshopMode: true,
      activeViewId: "imp",
      views: [
        createEmptyBoardView({
          id: "imp",
          name: "Board",
          elements: [
            {
              id: "ie",
              type: "command",
              label: "Imported",
              x: 9,
              y: 9,
              width: 100,
              height: 50,
            },
          ],
        }),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const s = useStormBoardStore.getState();
    expect(s.title).toBe("Offen");
    expect(s.appearance.canvas).toBe("#112233");
    expect(s.glossary).toEqual([{ term: "Lokal", definition: "bleibt" }]);
    expect(s.workshopMode).toBe(false);
    expect(s.views).toHaveLength(2);
    expect(s.activeViewId).toBe(result.activeViewId);
    expect(s.elements).toHaveLength(1);
    expect(s.elements[0]!.label).toBe("Imported");
    expect(s.elements[0]!.id).not.toBe("ie");

    store.undo();
    expect(useStormBoardStore.getState().views).toHaveLength(1);
    expect(useStormBoardStore.getState().elements[0]!.type).toBe("domainEvent");
  });

  it("moves elements to clipboard and pastes into another view", () => {
    const store = useStormBoardStore.getState();
    const idA = store.addElement("domainEvent", 10, 10);
    const idB = store.addElement("command", 120, 10);
    store.addRelation(idB, idA, "triggers");
    expect(useStormBoardStore.getState().relations).toHaveLength(1);

    store.moveToClipboard([idA, idB]);
    expect(useStormBoardStore.getState().elements).toHaveLength(0);
    expect(useStormBoardStore.getState().clipboard?.elements).toHaveLength(2);
    expect(useStormBoardStore.getState().clipboard?.relations).toHaveLength(1);

    const other = store.addView("Ziel");
    expect(useStormBoardStore.getState().activeViewId).toBe(other);
    const pasted = store.pasteClipboardAt(300, 300);
    expect(pasted).toHaveLength(2);
    expect(useStormBoardStore.getState().elements).toHaveLength(2);
    expect(useStormBoardStore.getState().relations).toHaveLength(1);
    expect(useStormBoardStore.getState().selectedElementIds).toEqual(pasted);
  });

  it("copies elements to clipboard without removing them", () => {
    const store = useStormBoardStore.getState();
    const idA = store.addElement("domainEvent", 10, 10);
    store.copyToClipboard([idA]);
    expect(useStormBoardStore.getState().elements).toHaveLength(1);
    expect(useStormBoardStore.getState().clipboard?.elements).toHaveLength(1);
  });

  it("duplicates elements with an offset", () => {
    const store = useStormBoardStore.getState();
    const idA = store.addElement("domainEvent", 40, 50);
    const before = useStormBoardStore.getState().elements.find((e) => e.id === idA)!;
    const duplicated = store.duplicateElements([idA]);
    expect(duplicated).toHaveLength(1);
    const state = useStormBoardStore.getState();
    expect(state.elements).toHaveLength(2);
    const copy = state.elements.find((e) => e.id === duplicated[0])!;
    expect(copy.x).toBe(before.x + 28);
    expect(copy.y).toBe(before.y + 28);
    expect(state.selectedElementIds).toEqual(duplicated);
  });
});
