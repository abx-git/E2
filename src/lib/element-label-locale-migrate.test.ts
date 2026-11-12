import { describe, expect, it } from "vitest";

import {
  countRemappablePlaceholderLabels,
  isPlaceholderElementLabel,
  remapElementLabelIfPlaceholder,
  shouldRemapPlaceholderLabel,
} from "@/lib/element-label-locale-migrate";
import type { StormElement } from "@/types/storm-element";

function el(type: StormElement["type"], label: string): StormElement {
  return { id: "x", type, label, x: 0, y: 0 };
}

describe("element-label-locale-migrate", () => {
  it("detects legacy German placeholder labels", () => {
    expect(isPlaceholderElementLabel("note", "Notiz")).toBe(true);
    expect(isPlaceholderElementLabel("processActivity", "Aktivität")).toBe(true);
    expect(isPlaceholderElementLabel("note", "My idea")).toBe(false);
  });

  it("remaps placeholders to the target locale only", () => {
    expect(shouldRemapPlaceholderLabel("note", "Notiz", "en")).toBe(true);
    expect(remapElementLabelIfPlaceholder(el("note", "Notiz"), "en").label).toBe("Note");
    expect(shouldRemapPlaceholderLabel("note", "Note", "en")).toBe(false);
    expect(remapElementLabelIfPlaceholder(el("note", "Note"), "de").label).toBe("Notiz");
  });

  it("counts remappable elements", () => {
    const elements = [el("note", "Notiz"), el("command", "Place order"), el("processActivity", "Aktivität")];
    expect(countRemappablePlaceholderLabels(elements, "en")).toBe(2);
  });
});
