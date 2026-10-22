import { describe, expect, it } from "vitest";

import { planFileReconcile } from "@/lib/file-board-reconcile";
import { encodeE2vDocument } from "@/lib/e2v";
import { createDefaultBoardDocument, createEmptyBoardView, stringifyExportedDocument } from "@/lib/storm-json";

describe("planFileReconcile", () => {
  it("applies E2V paste when the local editor is empty", () => {
    const doc = createDefaultBoardDocument({
      title: "E2V import",
      views: [
        createEmptyBoardView({
          id: "v1",
          name: "Flow",
          elements: [
            { id: "e1", type: "domainEvent", label: "Shipped", x: 12, y: 34, width: 160, height: 72 },
          ],
        }),
      ],
    });
    const e2v = encodeE2vDocument(doc, { scope: "document" })!;
    const emptyLocal = stringifyExportedDocument(
      createDefaultBoardDocument({ title: "", views: [createEmptyBoardView({ id: "empty", name: "Board" })] }),
    );

    expect(planFileReconcile(emptyLocal, e2v)).toEqual({ action: "apply_file" });
  });
});
