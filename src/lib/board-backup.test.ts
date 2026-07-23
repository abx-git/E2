import { describe, expect, it } from "vitest";

import {
  buildBackupFilename,
  formatBackupTimestamp,
  formatLastBackupLabel,
  slugForBackupFilename,
} from "@/lib/board-backup";

describe("board-backup", () => {
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
});
