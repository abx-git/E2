import { describe, expect, it } from "vitest";

import {
  guessImageMimeType,
  imageDataUrlFromMetadata,
  imageHasSource,
  imagePathRelativeToBoard,
  joinImagePathToBoardUrl,
  resolveBoardImageSrcSync,
} from "@/lib/board-image";
import type { StormElement } from "@/types/storm-element";

function imgEl(metadata: StormElement["metadata"]): StormElement {
  return { id: "i1", type: "image", label: "Shot", x: 0, y: 0, metadata };
}

describe("board-image", () => {
  it("joins relative paths to board JSON URL", () => {
    expect(
      joinImagePathToBoardUrl("https://cdn.example.com/boards/flow.e2.json", "shots/a.png"),
    ).toBe("https://cdn.example.com/boards/shots/a.png");
  });

  it("prefers imagePath over url and base64 when board URL is known", () => {
    const el = imgEl({
      imagePath: "a.png",
      imageUrl: "https://other/x.png",
      imageDataBase64: "abc",
    });
    expect(
      resolveBoardImageSrcSync(el, "https://cdn.example.com/foo.e2.json"),
    ).toBe("https://cdn.example.com/a.png");
  });

  it("falls back to https imageUrl", () => {
    const el = imgEl({ imageUrl: "cdn.example.com/pic.jpg" });
    expect(resolveBoardImageSrcSync(el, null)).toBe("https://cdn.example.com/pic.jpg");
  });

  it("builds data URL from base64", () => {
    const el = imgEl({ imageDataBase64: "YWJj", imageMimeType: "image/png" });
    expect(resolveBoardImageSrcSync(el, null)).toBe("data:image/png;base64,YWJj");
  });

  it("detects source and mime", () => {
    expect(imageHasSource(imgEl({ imagePath: "x" }))).toBe(true);
    expect(imageHasSource(imgEl({}))).toBe(false);
    expect(guessImageMimeType("a.webp")).toBe("image/webp");
    expect(imageDataUrlFromMetadata(undefined, "x", "a.jpg")?.startsWith("data:image/jpeg")).toBe(
      true,
    );
  });

  it("stores paths relative to board directory", () => {
    expect(imagePathRelativeToBoard("boards/flow.e2.json", "boards/assets/x.png")).toBe(
      "assets/x.png",
    );
  });
});