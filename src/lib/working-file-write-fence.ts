/**
 * Hard gates before truncating a working-file `.storm.json`.
 * Prevents empty/default boards and stale CAS from wiping nonempty disk content.
 */

import {
  boardImportPayloadFromExportText,
  documentHasContent,
  stableBoardStateKey,
} from "@/lib/storm-json";
import { boardImportPayloadFromAnyExportText } from "@/lib/board-import-text";

export type WorkingFileWriteFenceReason =
  | "ok"
  | "empty_over_nonempty"
  | "content_cas_mismatch"
  | "unknown_disk_baseline";

export type WorkingFileWriteFenceResult =
  | { ok: true }
  | { ok: false; reason: Exclude<WorkingFileWriteFenceReason, "ok">; message: string };

/** Stable content fingerprint for CAS (ignores exportedAt / viewport noise). */
export function boardContentHash(json: string): string | null {
  const trimmed = json.trim();
  if (!trimmed) return "";
  const payload =
    boardImportPayloadFromExportText(trimmed) ?? boardImportPayloadFromAnyExportText(trimmed);
  if (!payload) return null;
  return stableBoardStateKey(payload);
}

export function boardJsonHasContent(json: string): boolean {
  const trimmed = json.trim();
  if (!trimmed) return false;
  const payload =
    boardImportPayloadFromExportText(trimmed) ?? boardImportPayloadFromAnyExportText(trimmed);
  return Boolean(payload && documentHasContent(payload));
}

export interface AssertSafeWorkingFileWriteInput {
  outgoingJson: string;
  /** Current on-disk text (required unless skipCas for explicit Save As / Create). */
  diskJson?: string | null;
  /** Hash of the last known synced disk content (editor baseline). */
  expectedContentHash?: string | null;
  /** When true (Save As / Create after picker), content-CAS is skipped — empty-over-nonempty still blocked if diskJson provided. */
  skipCas?: boolean;
  /** If we have no disk snapshot and no baseline, refuse (unless skipCas). */
  requireDiskBaseline?: boolean;
}

/**
 * Decide whether truncating the Arbeitsdatei with `outgoingJson` is safe.
 * Call before `createWritable({ keepExistingData: false })`.
 */
export function assertSafeWorkingFileWrite(
  input: AssertSafeWorkingFileWriteInput,
): WorkingFileWriteFenceResult {
  const outgoing = input.outgoingJson;
  const disk = input.diskJson ?? null;
  const diskKnown = disk !== null && disk !== undefined;

  if (diskKnown && boardJsonHasContent(disk) && !boardJsonHasContent(outgoing)) {
    return {
      ok: false,
      reason: "empty_over_nonempty",
      message:
        "Leerer oder inhaltsloser Stand wird nicht über eine nicht-leere Arbeitsdatei geschrieben.",
    };
  }

  if (input.skipCas) {
    return { ok: true };
  }

  if (!diskKnown) {
    if (input.requireDiskBaseline !== false) {
      return {
        ok: false,
        reason: "unknown_disk_baseline",
        message: "Dateistand unbekannt — Speichern abgebrochen (kein Überschreiben ohne Basis).",
      };
    }
    return { ok: true };
  }

  const diskHash = boardContentHash(disk);
  const expected = input.expectedContentHash;

  // If we know what we last synced and disk differs, refuse (other tab / browser / editor).
  if (expected != null && expected !== "" && diskHash != null && diskHash !== expected) {
    return {
      ok: false,
      reason: "content_cas_mismatch",
      message:
        "Die Datei wurde außerhalb dieses Tabs geändert. Lokal nicht überschrieben — Speichern unter… oder Datei neu laden.",
    };
  }

  // Outgoing must match what we intend relative to disk when we have a baseline:
  // if disk matches expected, allow outgoing (dirty editor) through.
  // If no expected yet but disk has content and outgoing differs — still allow only when
  // caller had a valid mtime CAS path; content fence alone without expected is OK for first sync
  // after hydrate (expected should be set). Without expected + nonempty disk: refuse to be safe.
  if ((expected == null || expected === "") && boardJsonHasContent(disk)) {
    const outHash = boardContentHash(outgoing);
    if (outHash != null && diskHash != null && outHash !== diskHash) {
      return {
        ok: false,
        reason: "unknown_disk_baseline",
        message:
          "Kein bekannter Sync-Stand zur Datei — Speichern abgebrochen. Bitte Datei neu öffnen oder Speichern unter…",
      };
    }
  }

  return { ok: true };
}
