import { describe, expect, it } from "vitest";

import {
  connectorWaypointsInMarquee,
  connectorWaypointKey,
  translateConnectorForCanvasMove,
} from "@/lib/connector-waypoint-selection";
import type { BoardConnector } from "@/types/board-connector";

describe("connector-waypoint-selection", () => {
  it("finds bend handles fully inside a marquee", () => {
    const connectors: BoardConnector[] = [
      {
        id: "c1",
        source: { attach: "point", x: 0, y: 0 },
        target: { attach: "point", x: 100, y: 0 },
        waypoints: [
          { x: 50, y: 10 },
          { x: 50, y: 80 },
        ],
      },
    ];
    expect(connectorWaypointsInMarquee(connectors, { x: 40, y: 0, w: 20, h: 20 })).toEqual([
      { connectorId: "c1", index: 0 },
    ]);
    expect(connectorWaypointsInMarquee(connectors, { x: 0, y: 0, w: 60, h: 100 })).toEqual([
      { connectorId: "c1", index: 0 },
      { connectorId: "c1", index: 1 },
    ]);
  });

  it("translates waypoints when a linked element moves", () => {
    const conn: BoardConnector = {
      id: "c1",
      source: { attach: "element", id: "a" },
      target: { attach: "element", id: "b" },
      waypoints: [{ x: 40, y: 40 }],
    };
    const next = translateConnectorForCanvasMove(
      conn,
      10,
      -5,
      new Set(["a"]),
      new Set(),
    );
    expect(next.waypoints).toEqual([{ x: 50, y: 35 }]);
  });

  it("translates only selected waypoints when no element move", () => {
    const conn: BoardConnector = {
      id: "c1",
      source: { attach: "point", x: 0, y: 0 },
      target: { attach: "point", x: 100, y: 0 },
      waypoints: [
        { x: 20, y: 0 },
        { x: 80, y: 0 },
      ],
    };
    const key = connectorWaypointKey({ connectorId: "c1", index: 1 });
    const next = translateConnectorForCanvasMove(conn, 5, 0, new Set(), new Set([key]));
    expect(next.waypoints).toEqual([
      { x: 20, y: 0 },
      { x: 85, y: 0 },
    ]);
  });
});
