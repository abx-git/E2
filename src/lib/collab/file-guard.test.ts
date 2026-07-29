import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/store/storm-board-store", () => ({
  boardImportPayloadFromStore: vi.fn(() => ({
    schemaVersion: 1,
    views: [{ id: "v1", name: "A", elements: [], relations: [] }],
  })),
  boardJsonFromStoreState: vi.fn(() => "{}"),
}));

vi.mock("@/lib/storm-json", () => ({
  documentHasContent: vi.fn(() => false),
}));

const attached = vi.fn(() => false);
const dirty = vi.fn(() => false);

vi.mock("@/lib/working-file", () => ({
  isWorkingFileAttached: () => attached(),
  isWorkingFileDirty: () => dirty(),
}));

import {
  canCreateCollabRoom,
  createRoomBlockedHint,
  mustSecureBeforeCreateRoom,
} from "@/lib/collab/file-guard";

describe("create room file guard", () => {
  beforeEach(() => {
    attached.mockReturnValue(false);
    dirty.mockReturnValue(false);
  });

  it("blocks create without working file (no sync target)", () => {
    expect(mustSecureBeforeCreateRoom()).toBe(true);
    expect(canCreateCollabRoom()).toBe(false);
    expect(createRoomBlockedHint()).toMatch(/Speichern unter/);
  });

  it("blocks create when working file is dirty", () => {
    attached.mockReturnValue(true);
    dirty.mockReturnValue(true);
    expect(mustSecureBeforeCreateRoom()).toBe(true);
    expect(createRoomBlockedHint()).toMatch(/speichern/i);
  });

  it("allows create when attached and clean", () => {
    attached.mockReturnValue(true);
    dirty.mockReturnValue(false);
    expect(mustSecureBeforeCreateRoom()).toBe(false);
    expect(canCreateCollabRoom()).toBe(true);
    expect(createRoomBlockedHint()).toBe("");
  });
});
