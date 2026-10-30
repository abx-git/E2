import { describe, expect, it } from "vitest";

import {
  insertConnectorWaypoint,
  polylineMidpointAlongPath,
  projectPointOnSegment,
  removeConnectorWaypoint,
  resolveConnectorPolylinePoints,
} from "@/lib/connector-polyline";
import type { BoardConnector } from "@/types/board-connector";

const conn = (waypoints?: BoardConnector["waypoints"]): BoardConnector => ({
  id: "c1",
  source: { attach: "point", x: 0, y: 0 },
  target: { attach: "point", x: 100, y: 0 },
  waypoints,
});

describe("connector polyline", () => {
  it("resolves start, waypoints, and end", () => {
    const points = resolveConnectorPolylinePoints(
      conn([{ x: 50, y: 40 }]),
      [],
      [],
      [],
    );
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 0 },
    ]);
  });

  it("inserts and removes interior bends", () => {
    expect(insertConnectorWaypoint(undefined, 0, { x: 10, y: 5 })).toEqual([
      { x: 10, y: 5 },
    ]);
    expect(removeConnectorWaypoint([{ x: 1, y: 2 }], 0)).toBeUndefined();
  });

  it("projects onto a segment", () => {
    const hit = projectPointOnSegment({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(hit.point).toEqual({ x: 50, y: 0 });
    expect(hit.distance).toBe(10);
  });

  it("finds midpoint along bent path", () => {
    const mid = polylineMidpointAlongPath([
      { x: 0, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 0 },
    ]);
    expect(mid.x).toBeGreaterThan(40);
    expect(mid.x).toBeLessThan(60);
  });
});
