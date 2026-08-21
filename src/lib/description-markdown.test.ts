import { describe, expect, it } from "vitest";

import { markdownToPlainText, normalizeDescriptionMarkdown } from "@/lib/description-markdown";

describe("description-markdown", () => {
  it("normalizes Windows newlines", () => {
    expect(normalizeDescriptionMarkdown("a\r\nb")).toBe("a\nb");
  });

  it("flattens headings, emphasis, and links for export", () => {
    expect(markdownToPlainText("# Titel\n\n**fett** und [Docs](https://example.com)")).toBe(
      "Titel\n\nfett und Docs",
    );
  });

  it("keeps list items as lines", () => {
    expect(markdownToPlainText("- eins\n- zwei")).toBe("eins\nzwei");
  });
});
