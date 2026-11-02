import { describe, expect, it } from "vitest";

import {
  connectorRigidWithMoveSet,
  inferCanvasSelectionMoveDelta,
  translateConnectorsForMoveSet,
} from "@/lib/connector-selection-move";
import type { BoardConnector } from "@/types/board-connector";

describe("connector selection move", () => {
  const cn: BoardConnector = {
    id: "cn1",
    source: { attach: "element", id: "e1" },
    target: { attach: "element", id: "e2" },
    waypoints: [{ x: 100, y: 50 }],
  };

  it("detects rigid move when both endpoints are in the batch", () => {
    const moved = new Set(["e1", "e2"]);
    expect(connectorRigidWithMoveSet(cn, moved)).toBe(true);
  });

  it("skips when only one endpoint moves", () => {
    expect(connectorRigidWithMoveSet(cn, new Set(["e1"]))).toBe(false);
  });

  it("translates waypoints with the selection delta", () => {
    const moved = new Set(["e1", "e2"]);
    const [next] = translateConnectorsForMoveSet([cn], moved, 20, -10);
    expect(next!.waypoints).toEqual([{ x: 120, y: 40 }]);
  });

  it("infers delta from element updates", () => {
    const delta = inferCanvasSelectionMoveDelta(
      [{ id: "e1", type: "command", label: "A", x: 10, y: 20, width: 80, height: 40 }],
      [],
      [],
      { elements: [{ id: "e1", x: 30, y: 25 }] },
    );
    expect(delta).toEqual({ dx: 20, dy: 5 });
  });
});
