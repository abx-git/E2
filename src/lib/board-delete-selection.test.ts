import { describe, expect, it } from "vitest";
import {
  deleteSelectionTarget,
  type DeleteSelectionState,
} from "@/lib/board-delete-selection";

function slice(partial: Partial<DeleteSelectionState>): DeleteSelectionState {
  return {
    selectedConnectorId: null,
    selectedRelationId: null,
    selectedContextRelationId: null,
    selectedCanvasLineId: null,
    selectedElementIds: [],
    selectedSwimlaneIds: [],
    selectedBoundedContextIds: [],
    ...partial,
  };
}

describe("deleteSelectionTarget", () => {
  it("prefers connector selection over elements", () => {
    expect(
      deleteSelectionTarget(
        slice({
          selectedConnectorId: "conn-1",
          selectedElementIds: ["el-1"],
        }),
      ),
    ).toEqual({ kind: "connector", id: "conn-1" });
  });

  it("returns all selected element ids", () => {
    expect(
      deleteSelectionTarget(slice({ selectedElementIds: ["a", "b"] })),
    ).toEqual({ kind: "elements", ids: ["a", "b"] });
  });

  it("falls through to regions when no elements selected", () => {
    expect(
      deleteSelectionTarget(slice({ selectedSwimlaneIds: ["lane-1"] })),
    ).toEqual({ kind: "swimlanes", ids: ["lane-1"] });
  });
});
