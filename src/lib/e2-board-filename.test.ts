import { describe, expect, it } from "vitest";

import {
  E2_BOARD_FILE_SUFFIX,
  STANDARD_E2_BOARD_FILENAME,
  stripBoardFileSuffix,
  suggestedE2BoardFilename,
} from "@/lib/e2-board-filename";

describe("e2-board-filename", () => {
  it("uses .e2.json as default", () => {
    expect(STANDARD_E2_BOARD_FILENAME).toBe("board.e2.json");
    expect(E2_BOARD_FILE_SUFFIX).toBe(".e2.json");
  });

  it("suggests slugged names", () => {
    expect(suggestedE2BoardFilename("My Workshop")).toBe("my-workshop.e2.json");
    expect(suggestedE2BoardFilename("Architektur-Review-XY12")).toBe(
      "architektur-review-xy12.e2.json",
    );
  });

  it("upgrades legacy .e2.json suggestions", () => {
    expect(suggestedE2BoardFilename("alpha.e2.json")).toBe("alpha.e2.json");
    expect(suggestedE2BoardFilename("workshop.e2.json")).toBe("workshop.e2.json");
  });

  it("strips board suffixes", () => {
    expect(stripBoardFileSuffix("demo.e2.json")).toBe("demo");
    expect(stripBoardFileSuffix("demo.e2.json")).toBe("demo");
  });
});
