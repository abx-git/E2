import { afterEach, describe, expect, it } from "vitest";

import {
  applyPreCollabStashToStore,
  capturePreCollabStash,
  clearPreCollabStash,
  getPreCollabStash,
  hasPreCollabStash,
} from "@/lib/collab/pre-collab-stash";
import { boardJsonFromStoreState } from "@/lib/file-board-reconcile";
import { forceApplyBoardJson, isWorkingFilePersistPaused } from "@/lib/working-file";
import { useStormBoardStore } from "@/store/storm-board-store";

describe("pre-collab-stash", () => {
  afterEach(() => {
    clearPreCollabStash();
    useStormBoardStore.getState().replaceBoardFromImport({
      title: "Empty",
      glossary: [],
      appearance: useStormBoardStore.getState().appearance,
      workshopMode: false,
      activeViewId: useStormBoardStore.getState().activeViewId,
      views: useStormBoardStore.getState().views.map((v) => ({
        ...v,
        elements: [],
        relations: [],
        contextRelations: [],
        swimlanes: [],
        boundedContexts: [],
      })),
    });
  });

  it("captures and restores board JSON", () => {
    useStormBoardStore.getState().setTitle("Before Collab");
    capturePreCollabStash();
    expect(hasPreCollabStash()).toBe(true);
    const stash = getPreCollabStash();
    expect(stash?.json).toContain("Before Collab");

    useStormBoardStore.getState().setTitle("In Room");
    expect(useStormBoardStore.getState().title).toBe("In Room");

    expect(applyPreCollabStashToStore()).toBe(true);
    expect(useStormBoardStore.getState().title).toBe("Before Collab");
  });

  it("forceApplyBoardJson replaces the store without conflict UI", () => {
    useStormBoardStore.getState().setTitle("A");
    const json = boardJsonFromStoreState().replace('"A"', '"Restored"');
    expect(forceApplyBoardJson(json)).toBe(true);
    expect(useStormBoardStore.getState().title).toBe("Restored");
  });
});

describe("working-file persist pause", () => {
  it("is not paused by default (collab mirrors locally)", () => {
    expect(isWorkingFilePersistPaused()).toBe(false);
  });
});
