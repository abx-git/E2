import { rectBorderHitFromRay } from "@/lib/connector-geometry";
import type { BoardConnector, ConnectorWaypoint } from "@/types/board-connector";
import { elementCanvasBounds } from "@/lib/note-compact";
import { elementBounds } from "@/lib/selection-geometry";
import type { ElementMetadata, StormElement } from "@/types/storm-element";

/** Note pinned to an interior connector bend (stored in element metadata). */
export type NoteConnectorPin = NonNullable<ElementMetadata["noteConnectorPin"]> & {
  offsetX: number;
  offsetY: number;
};

export function readNoteConnectorPin(
  metadata: ElementMetadata | undefined,
): NoteConnectorPin | null {
  const raw = metadata?.noteConnectorPin;
  if (!raw || typeof raw !== "object") return null;
  const connectorId = typeof raw.connectorId === "string" ? raw.connectorId : "";
  const waypointIndex = typeof raw.waypointIndex === "number" ? raw.waypointIndex : -1;
  if (!connectorId || waypointIndex < 0) return null;
  return {
    connectorId,
    waypointIndex,
    offsetX: typeof raw.offsetX === "number" && Number.isFinite(raw.offsetX) ? raw.offsetX : 0,
    offsetY: typeof raw.offsetY === "number" && Number.isFinite(raw.offsetY) ? raw.offsetY : 0,
  };
}

export function withNoteConnectorPin(
  metadata: ElementMetadata | undefined,
  pin: NoteConnectorPin | null,
): ElementMetadata | undefined {
  const base = { ...(metadata ?? {}) };
  if (!pin) {
    delete base.noteConnectorPin;
  } else {
    base.noteConnectorPin = pin;
  }
  return Object.keys(base).length ? base : undefined;
}

export function waypointAt(
  connector: BoardConnector | undefined,
  index: number,
): ConnectorWaypoint | null {
  const wp = connector?.waypoints?.[index];
  return wp ? { x: wp.x, y: wp.y } : null;
}

/** Live waypoint while dragging a bend handle (optional). */
export function waypointForPin(
  pin: NoteConnectorPin,
  connectors: BoardConnector[],
  liveWaypoint?: { connectorId: string; index: number; point: ConnectorWaypoint },
): ConnectorWaypoint | null {
  const conn = connectors.find((c) => c.id === pin.connectorId);
  if (
    liveWaypoint &&
    liveWaypoint.connectorId === pin.connectorId &&
    liveWaypoint.index === pin.waypointIndex
  ) {
    return { ...liveWaypoint.point };
  }
  return waypointAt(conn, pin.waypointIndex);
}

/** Thin leader: connector bend → nearest edge of the pinned note card. */
export function noteConnectorPinLeaderSegment(
  note: StormElement,
  connectors: BoardConnector[],
  notesCompact: boolean,
  liveWaypoint?: { connectorId: string; index: number; point: ConnectorWaypoint },
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (note.type !== "note") return null;
  const pin = readNoteConnectorPin(note.metadata);
  if (!pin) return null;
  const wp = waypointForPin(pin, connectors, liveWaypoint);
  if (!wp) return null;
  const bounds = elementCanvasBounds(note, notesCompact);
  const rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const onNote = rectBorderHitFromRay(rect, wp, { x: cx, y: cy });
  return { x1: wp.x, y1: wp.y, x2: onNote.x, y2: onNote.y };
}

export function notePositionFromPin(
  pin: NoteConnectorPin,
  connectors: BoardConnector[],
): { x: number; y: number } | null {
  const conn = connectors.find((c) => c.id === pin.connectorId);
  const wp = waypointAt(conn, pin.waypointIndex);
  if (!wp) return null;
  return { x: wp.x + pin.offsetX, y: wp.y + pin.offsetY };
}

export function syncNotePositionsFromPins(
  elements: StormElement[],
  connectors: BoardConnector[],
): StormElement[] {
  let changed = false;
  const next = elements.map((el) => {
    if (el.type !== "note") return el;
    const pin = readNoteConnectorPin(el.metadata);
    if (!pin) return el;
    const pos = notePositionFromPin(pin, connectors);
    if (!pos) {
      changed = true;
      return { ...el, metadata: withNoteConnectorPin(el.metadata, null) };
    }
    if (el.x === pos.x && el.y === pos.y) return el;
    changed = true;
    return { ...el, x: pos.x, y: pos.y };
  });
  return changed ? next : elements;
}

export function clearNotePinsForConnector(
  elements: StormElement[],
  connectorId: string,
): StormElement[] {
  let changed = false;
  const next = elements.map((el) => {
    if (el.type !== "note") return el;
    const pin = readNoteConnectorPin(el.metadata);
    if (!pin || pin.connectorId !== connectorId) return el;
    changed = true;
    return { ...el, metadata: withNoteConnectorPin(el.metadata, null) };
  });
  return changed ? next : elements;
}

/** When a waypoint row is removed, detach notes on that index and shift higher indices. */
export function adjustNotePinsAfterWaypointRemoval(
  elements: StormElement[],
  connectorId: string,
  removedIndex: number,
): StormElement[] {
  let changed = false;
  const next = elements.map((el) => {
    if (el.type !== "note") return el;
    const pin = readNoteConnectorPin(el.metadata);
    if (!pin || pin.connectorId !== connectorId) return el;
    if (pin.waypointIndex === removedIndex) {
      changed = true;
      return { ...el, metadata: withNoteConnectorPin(el.metadata, null) };
    }
    if (pin.waypointIndex > removedIndex) {
      changed = true;
      return {
        ...el,
        metadata: withNoteConnectorPin(el.metadata, {
          ...pin,
          waypointIndex: pin.waypointIndex - 1,
        }),
      };
    }
    return el;
  });
  return changed ? next : elements;
}

function elementCenter(el: StormElement): { x: number; y: number } {
  const b = elementBounds(el);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function findClosestConnectorWaypoint(
  point: { x: number; y: number },
  connectors: BoardConnector[],
  maxDistance: number,
): { connectorId: string; waypointIndex: number; x: number; y: number } | null {
  let best: {
    connectorId: string;
    waypointIndex: number;
    x: number;
    y: number;
    dist: number;
  } | null = null;

  for (const conn of connectors) {
    const wps = conn.waypoints ?? [];
    for (let i = 0; i < wps.length; i++) {
      const wp = wps[i]!;
      const dist = Math.hypot(point.x - wp.x, point.y - wp.y);
      if (dist > maxDistance) continue;
      if (!best || dist < best.dist) {
        best = { connectorId: conn.id, waypointIndex: i, x: wp.x, y: wp.y, dist };
      }
    }
  }
  return best
    ? {
        connectorId: best.connectorId,
        waypointIndex: best.waypointIndex,
        x: best.x,
        y: best.y,
      }
    : null;
}

const SNAP_DISTANCE = 36;
const DETACH_DISTANCE = 48;

/** After a note moves, snap to a nearby waypoint or refresh / clear an existing pin. */
export function applyNoteMovePinUpdate(
  note: StormElement,
  connectors: BoardConnector[],
): StormElement {
  if (note.type !== "note") return note;
  const center = elementCenter(note);
  const existing = readNoteConnectorPin(note.metadata);

  if (existing) {
    const wp = waypointAt(
      connectors.find((c) => c.id === existing.connectorId),
      existing.waypointIndex,
    );
    if (!wp) {
      return { ...note, metadata: withNoteConnectorPin(note.metadata, null) };
    }
    const anchorX = wp.x + existing.offsetX;
    const anchorY = wp.y + existing.offsetY;
    const drift = Math.hypot(note.x - anchorX, note.y - anchorY);
    if (drift > DETACH_DISTANCE) {
      return { ...note, metadata: withNoteConnectorPin(note.metadata, null) };
    }
    const offsetX = note.x - wp.x;
    const offsetY = note.y - wp.y;
    if (offsetX === existing.offsetX && offsetY === existing.offsetY) return note;
    return {
      ...note,
      metadata: withNoteConnectorPin(note.metadata, {
        ...existing,
        offsetX,
        offsetY,
      }),
    };
  }

  const snap = findClosestConnectorWaypoint(center, connectors, SNAP_DISTANCE);
  if (!snap) return note;
  return {
    ...note,
    x: note.x,
    y: note.y,
    metadata: withNoteConnectorPin(note.metadata, {
      connectorId: snap.connectorId,
      waypointIndex: snap.waypointIndex,
      offsetX: note.x - snap.x,
      offsetY: note.y - snap.y,
    }),
  };
}

export function pinNoteToConnectorWaypoint(
  note: StormElement,
  connectorId: string,
  waypointIndex: number,
  connectors: BoardConnector[],
): StormElement {
  if (note.type !== "note") return note;
  const conn = connectors.find((c) => c.id === connectorId);
  const wp = waypointAt(conn, waypointIndex);
  if (!wp) return note;
  const pin: NoteConnectorPin = {
    connectorId,
    waypointIndex,
    offsetX: note.x - wp.x,
    offsetY: note.y - wp.y,
  };
  return {
    ...note,
    metadata: withNoteConnectorPin(note.metadata, pin),
    x: wp.x + pin.offsetX,
    y: wp.y + pin.offsetY,
  };
}

export function detectRemovedWaypointIndex(
  prev: ConnectorWaypoint[] | undefined,
  next: ConnectorWaypoint[] | undefined,
): number | null {
  const a = prev ?? [];
  const b = next ?? [];
  if (b.length >= a.length) return null;
  if (b.length === 0 && a.length > 0) return 0;
  for (let i = 0; i < a.length; i++) {
    if (i >= b.length) return i;
    const p = a[i]!;
    const n = b[i]!;
    if (Math.hypot(p.x - n.x, p.y - n.y) > 0.5) return i;
  }
  return a.length - 1;
}

export function applyNotePinUpdatesForMovedNotes(
  elements: StormElement[],
  movedNoteIds: Set<string>,
  connectors: BoardConnector[],
): StormElement[] {
  if (movedNoteIds.size === 0) return elements;
  let changed = false;
  const next = elements.map((el) => {
    if (el.type !== "note" || !movedNoteIds.has(el.id)) return el;
    const updated = applyNoteMovePinUpdate(el, connectors);
    if (updated !== el) changed = true;
    return updated;
  });
  return changed ? next : elements;
}
