import { describe, expect, it } from "vitest";

import {
  createEmptyFileLibrary,
  FILE_LIBRARY_KIND,
  FILE_LIBRARY_VERSION,
  libraryBackupRelativePath,
  normalizeLibraryRelativePath,
  parseFileLibraryJson,
  replaceLibraryPathBasename,
  serializeFileLibrary,
  sortFileLibraryEntries,
  titleFromBoardJson,
  upsertFileLibraryEntry,
  renameFileLibraryPath,
} from "@/lib/file-library";

describe("file-library document", () => {
  it("normalizes relative paths", () => {
    expect(normalizeLibraryRelativePath("\\foo\\bar.storm.json")).toBe("foo/bar.storm.json");
    expect(normalizeLibraryRelativePath("./boards/a.json")).toBe("boards/a.json");
    expect(normalizeLibraryRelativePath("/x/y.json/")).toBe("x/y.json");
  });

  it("builds backup paths under backups/", () => {
    expect(libraryBackupRelativePath("mein-board-backup.storm.json")).toBe(
      "backups/mein-board-backup.storm.json",
    );
    expect(libraryBackupRelativePath("nested/x.json")).toBe("backups/x.json");
  });

  it("replaces the basename after rename", () => {
    expect(replaceLibraryPathBasename("workshops/old.storm.json", "neu.storm.json")).toBe(
      "workshops/neu.storm.json",
    );
  });

  it("reads the board title from JSON", () => {
    expect(titleFromBoardJson('{"title":"Workshop ACME"}', "fallback")).toBe("Workshop ACME");
    expect(titleFromBoardJson("{not json", "x.json")).toBe("x.json");
  });

  it("round-trips serialize/parse", () => {
    const doc = createEmptyFileLibrary();
    const { doc: next } = upsertFileLibraryEntry(doc, {
      title: "Workshop",
      path: "workshop.storm.json",
      kind: "board",
      updatedAt: 1_700_000_000_000,
    });
    const parsed = parseFileLibraryJson(serializeFileLibrary(next));
    expect(parsed?.kind).toBe(FILE_LIBRARY_KIND);
    expect(parsed?.version).toBe(FILE_LIBRARY_VERSION);
    expect(parsed?.files).toHaveLength(1);
    expect(parsed?.files[0]?.title).toBe("Workshop");
    expect(parsed?.files[0]?.path).toBe("workshop.storm.json");
  });

  it("upserts by path+kind and keeps id", () => {
    const empty = createEmptyFileLibrary();
    const first = upsertFileLibraryEntry(empty, {
      title: "A",
      path: "a.storm.json",
      kind: "board",
      updatedAt: 10,
    });
    const second = upsertFileLibraryEntry(first.doc, {
      id: first.entry.id,
      title: "A renamed",
      path: "a.storm.json",
      kind: "board",
      updatedAt: 20,
    });
    expect(second.changed).toBe(true);
    expect(second.doc.files).toHaveLength(1);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.title).toBe("A renamed");
  });

  it("does not treat a backup as the same board path", () => {
    let doc = createEmptyFileLibrary();
    doc = upsertFileLibraryEntry(doc, {
      title: "A",
      path: "a.storm.json",
      kind: "board",
      updatedAt: 1,
    }).doc;
    doc = upsertFileLibraryEntry(doc, {
      title: "A",
      path: "backups/a-backup.storm.json",
      kind: "backup",
      updatedAt: 2,
    }).doc;
    expect(doc.files).toHaveLength(2);
  });

  it("sorts boards before backups, newest first", () => {
    const sorted = sortFileLibraryEntries([
      { id: "1", title: "Old", path: "old.storm.json", kind: "board", updatedAt: 1 },
      { id: "2", title: "Bak", path: "backups/b.json", kind: "backup", updatedAt: 9 },
      { id: "3", title: "New", path: "new.storm.json", kind: "board", updatedAt: 5 },
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["3", "1", "2"]);
  });

  it("renames a stored path", () => {
    const { doc } = upsertFileLibraryEntry(createEmptyFileLibrary(), {
      title: "A",
      path: "folder/old.storm.json",
      kind: "board",
      updatedAt: 1,
    });
    const renamed = renameFileLibraryPath(doc, "folder/old.storm.json", "folder/neu.storm.json");
    expect(renamed.files[0]?.path).toBe("folder/neu.storm.json");
  });

  it("rejects unrelated JSON as a library", () => {
    expect(parseFileLibraryJson('{"kind":"event-storming-tool","files":[]}')).toBeNull();
    expect(parseFileLibraryJson("{")).toBeNull();
  });
});
