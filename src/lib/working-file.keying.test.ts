import { describe, expect, it } from "vitest";

import {
  LEGACY_IDB_HANDLE_KEY,
  LEGACY_IDB_MOBILE_KEY,
  STANDARD_WORKING_FILENAME,
  workingFileHandleIdbKey,
  workingFileMobileIdbKey,
} from "@/lib/working-file";

describe("working-file IDB keying", () => {
  it("keys handles and mobile mirrors by normalized filename", () => {
    expect(workingFileHandleIdbKey("Projekt-A.storm.json")).toBe("handle:projekt-a.storm.json");
    expect(workingFileMobileIdbKey("Projekt-A.storm.json")).toBe("mobile:projekt-a.storm.json");
    expect(workingFileHandleIdbKey("path/to/Board.JSON")).toBe("handle:board.json");
  });

  it("uses the standard filename when input is blank", () => {
    expect(workingFileHandleIdbKey("")).toBe(
      `handle:${STANDARD_WORKING_FILENAME.toLowerCase()}`,
    );
    expect(workingFileMobileIdbKey("   ")).toBe(
      `mobile:${STANDARD_WORKING_FILENAME.toLowerCase()}`,
    );
  });

  it("keeps legacy singleton key names for migration", () => {
    expect(LEGACY_IDB_HANDLE_KEY).toBe("board-json");
    expect(LEGACY_IDB_MOBILE_KEY).toBe("mobile-working-copy");
    expect(workingFileHandleIdbKey("board.storm.json")).not.toBe(LEGACY_IDB_HANDLE_KEY);
    expect(workingFileMobileIdbKey("board.storm.json")).not.toBe(LEGACY_IDB_MOBILE_KEY);
  });

  it("isolates different filenames into different keys", () => {
    expect(workingFileHandleIdbKey("a.storm.json")).not.toBe(
      workingFileHandleIdbKey("b.storm.json"),
    );
    expect(workingFileMobileIdbKey("a.storm.json")).not.toBe(
      workingFileMobileIdbKey("b.storm.json"),
    );
  });
});
