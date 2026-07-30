import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_APPEARANCE } from "@/lib/board-appearance";
import {
  backupBeforeSuspiciousSwitch,
  boardNeedsSafetyBackup,
  buildBackupFilename,
  createBoardBackupNow,
  formatBackupTimestamp,
  formatLastBackupLabel,
  getLastBackupPersistKey,
  rememberBackupBaselineFromStore,
  resetLastBackupPersistKey,
  resetSuspiciousSwitchBackupDebounce,
  slugForBackupFilename,
} from "@/lib/board-backup";
import { createEmptyBoardView } from "@/lib/storm-json";
import { useStormBoardStore } from "@/store/storm-board-store";

vi.mock("@/lib/working-file", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/working-file")>();
  return {
    ...actual,
    isWorkingFileAttached: vi.fn(() => false),
    isWorkingFileDirty: vi.fn(() => false),
  };
});

import { isWorkingFileAttached, isWorkingFileDirty } from "@/lib/working-file";

const mockAttached = vi.mocked(isWorkingFileAttached);
const mockDirty = vi.mocked(isWorkingFileDirty);

describe("board-backup", () => {
  beforeEach(() => {
    resetLastBackupPersistKey();
    resetSuspiciousSwitchBackupDebounce();
    mockAttached.mockReturnValue(false);
    mockDirty.mockReturnValue(false);
    useStormBoardStore.getState().replaceBoardFromImport({
      title: "Backup Test",
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      workshopMode: false,
      activeViewId: "v1",
      views: [createEmptyBoardView({ id: "v1", name: "Board" })],
    });
  });

  it("builds timestamped filenames", () => {
    const d = new Date(2026, 6, 23, 7, 5, 9); // month is 0-based
    expect(formatBackupTimestamp(d)).toBe("2026-07-23-070509");
    expect(buildBackupFilename("Mein Board", d)).toBe(
      "mein-board-backup-2026-07-23-070509.storm.json",
    );
  });

  it("slugs titles safely", () => {
    expect(slugForBackupFilename("  Hello World!  ")).toBe("hello-world");
    expect(slugForBackupFilename("")).toBe("board");
  });

  it("formats last-backup label", () => {
    expect(formatLastBackupLabel(null)).toBe("Noch kein Backup");
    expect(formatLastBackupLabel(Date.UTC(2026, 0, 1, 12, 0, 0))).toMatch(/2026/);
  });

  it("needs safety backup only when unsaved content exists", () => {
    expect(boardNeedsSafetyBackup()).toBe(false);

    useStormBoardStore.getState().addElement("domainEvent", 10, 20);
    expect(boardNeedsSafetyBackup()).toBe(true);

    mockAttached.mockReturnValue(true);
    mockDirty.mockReturnValue(false);
    expect(boardNeedsSafetyBackup()).toBe(false);

    mockDirty.mockReturnValue(true);
    expect(boardNeedsSafetyBackup()).toBe(true);
  });

  it("skips switch backup when already saved", () => {
    useStormBoardStore.getState().addElement("domainEvent", 10, 20);
    mockAttached.mockReturnValue(true);
    mockDirty.mockReturnValue(false);
    expect(backupBeforeSuspiciousSwitch("view")).toEqual({
      skipped: true,
      reason: "already_saved",
    });
    expect(backupBeforeSuspiciousSwitch("file")).toEqual({
      skipped: true,
      reason: "already_saved",
    });
  });

  it("skips onlyIfChanged backups when the board is unchanged", () => {
    useStormBoardStore.getState().addElement("domainEvent", 10, 20);
    rememberBackupBaselineFromStore();
    expect(getLastBackupPersistKey()).toBeTruthy();

    expect(createBoardBackupNow({ onlyIfChanged: true })).toEqual({
      skipped: true,
      reason: "unchanged",
    });

    useStormBoardStore.getState().addElement("command", 30, 40);
    rememberBackupBaselineFromStore();
    expect(createBoardBackupNow({ onlyIfChanged: true })).toEqual({
      skipped: true,
      reason: "unchanged",
    });
  });

  it("does not skip onlyIfChanged when there is no baseline yet", () => {
    useStormBoardStore.getState().addElement("domainEvent", 10, 20);
    expect(getLastBackupPersistKey()).toBeNull();
    useStormBoardStore.getState().replaceBoardFromImport({
      title: "Empty",
      glossary: [],
      appearance: { ...DEFAULT_APPEARANCE },
      workshopMode: false,
      activeViewId: "v1",
      views: [createEmptyBoardView({ id: "v1", name: "Board" })],
    });
    expect(createBoardBackupNow({ onlyIfChanged: true })).toEqual({
      skipped: true,
      reason: "empty",
    });
  });
});
