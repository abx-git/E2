import { describe, expect, it } from "vitest";

import type { BoardConnector } from "@/types/board-connector";
import type { StormElement } from "@/types/storm-element";
import {
  adjustNotePinsAfterWaypointRemoval,
  applyNoteMovePinUpdate,
  noteConnectorPinLeaderSegment,
  pinNoteToConnectorWaypoint,
  readNoteConnectorPin,
  syncNotePositionsFromPins,
} from "@/lib/note-connector-pin";

const note = (overrides: Partial<StormElement> = {}): StormElement => ({
  id: "n1",
  type: "note",
  label: "Hinweis",
  x: 100,
  y: 80,
  ...overrides,
});

const conn = (waypoints: BoardConnector["waypoints"]): BoardConnector => ({
  id: "cn1",
  source: { attach: "point", x: 0, y: 0 },
  target: { attach: "point", x: 200, y: 0 },
  waypoints,
});

describe("note-connector-pin", () => {
  it("pins and follows waypoint moves", () => {
    const connectors = [conn([{ x: 50, y: 50 }])];
    let el = pinNoteToConnectorWaypoint(note({ x: 60, y: 70 }), "cn1", 0, connectors);
    expect(readNoteConnectorPin(el.metadata)?.offsetX).toBe(10);

    connectors[0] = { ...connectors[0]!, waypoints: [{ x: 80, y: 50 }] };
    const synced = syncNotePositionsFromPins([el], connectors);
    expect(synced[0]!.x).toBe(90);
    expect(synced[0]!.y).toBe(70);
  });

  it("detaches when dragged far from pin anchor", () => {
    const connectors = [conn([{ x: 0, y: 0 }])];
    const pinned = pinNoteToConnectorWaypoint(note({ x: 5, y: 5 }), "cn1", 0, connectors);
    const moved = applyNoteMovePinUpdate({ ...pinned, x: 200, y: 200 }, connectors);
    expect(readNoteConnectorPin(moved.metadata)).toBeNull();
  });

  it("builds a leader segment from waypoint to note edge", () => {
    const connectors = [conn([{ x: 100, y: 100 }])];
    const n = pinNoteToConnectorWaypoint(
      note({ x: 120, y: 130, width: 80, height: 60 }),
      "cn1",
      0,
      connectors,
    );
    const seg = noteConnectorPinLeaderSegment(n, connectors, false);
    expect(seg).not.toBeNull();
    expect(seg!.x1).toBe(100);
    expect(seg!.y1).toBe(100);
    expect(seg!.x2).toBeGreaterThanOrEqual(120);
    expect(seg!.x2).toBeLessThanOrEqual(200);
  });

  it("reindexes pins when a waypoint is removed", () => {
    const connectors = [conn([{ x: 0, y: 0 }, { x: 10, y: 0 }])];
    const elements = [
      pinNoteToConnectorWaypoint(note({ id: "a" }), "cn1", 1, connectors),
    ];
    const adjusted = adjustNotePinsAfterWaypointRemoval(elements, "cn1", 0);
    expect(readNoteConnectorPin(adjusted[0]!.metadata)?.waypointIndex).toBe(0);
  });
});
