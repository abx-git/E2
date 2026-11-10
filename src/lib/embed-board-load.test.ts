import { describe, expect, it } from "vitest";

import {
  loadEmbedBoardFromText,
  loadEmbedBoardFromPayload,
} from "@/lib/embed-board-load";
import {
  createDefaultBoardDocument,
  stringifyExportedDocument,
  buildBoardSnapshot,
} from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";

describe("embed-board-load", () => {
  it("loads document in view interaction mode", () => {
    const doc = createDefaultBoardDocument({ title: "Embedded" });
    const json = stringifyExportedDocument(buildBoardSnapshot(doc));
    expect(loadEmbedBoardFromText(json, { editable: false })).toBe(true);
    const state = useStormBoardStore.getState();
    expect(state.title).toBe("Embedded");
    expect(state.interactionMode).toBe("view");
    expect(state.propertiesPanelOpen).toBe(true);
    expect(state.elementsPanelOpen).toBe(false);
  });

  it("respects editable flag", () => {
    const doc = createDefaultBoardDocument({ title: "Editable embed" });
    loadEmbedBoardFromPayload(buildBoardSnapshot(doc), { editable: true });
    expect(useStormBoardStore.getState().interactionMode).toBe("edit");
  });
});
