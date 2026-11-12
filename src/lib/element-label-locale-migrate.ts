import { LOCALES, type Locale } from "@/i18n/config";
import { defaultLabelForElementType, localizedElementTypeLabel } from "@/i18n/domain-labels";
import { ELEMENT_STYLES, isKnownElementType } from "@/lib/element-styles";
import { isCanvasBoardView, type BoardView } from "@/lib/storm-json";
import type { ElementType, StormElement } from "@/types/storm-element";

const SWIMLANE_NUMBERED_RE = /^swimlane\s+\d+$/i;

function placeholderLabelsForType(type: ElementType): Set<string> {
  const set = new Set<string>();
  for (const locale of LOCALES) {
    set.add(defaultLabelForElementType(type, locale).trim());
    set.add(localizedElementTypeLabel(type, locale).trim());
  }
  const legacy = ELEMENT_STYLES[type]?.label?.trim();
  if (legacy) set.add(legacy);
  return set;
}

const PLACEHOLDER_BY_TYPE = new Map<ElementType, Set<string>>();

function placeholdersFor(type: ElementType): Set<string> {
  let set = PLACEHOLDER_BY_TYPE.get(type);
  if (!set) {
    set = placeholderLabelsForType(type);
    PLACEHOLDER_BY_TYPE.set(type, set);
  }
  return set;
}

/** True when the title still matches a factory default in any supported locale. */
export function isPlaceholderElementLabel(type: ElementType, label: string | undefined): boolean {
  const trimmed = label?.trim();
  if (!trimmed) return false;
  if (type === "customCard") return false;
  if (type === "swimlane" && SWIMLANE_NUMBERED_RE.test(trimmed)) return true;
  if (!isKnownElementType(type)) return false;
  return placeholdersFor(type).has(trimmed);
}

export function shouldRemapPlaceholderLabel(
  type: ElementType,
  label: string | undefined,
  targetLocale: Locale,
): boolean {
  if (!isPlaceholderElementLabel(type, label)) return false;
  const target = defaultLabelForElementType(type, targetLocale).trim();
  return label!.trim() !== target;
}

export function remapElementLabelIfPlaceholder(el: StormElement, targetLocale: Locale): StormElement {
  if (!shouldRemapPlaceholderLabel(el.type, el.label, targetLocale)) return el;
  return { ...el, label: defaultLabelForElementType(el.type, targetLocale) };
}

export function countRemappablePlaceholderLabels(
  elements: StormElement[],
  targetLocale: Locale,
): number {
  return elements.filter((el) => shouldRemapPlaceholderLabel(el.type, el.label, targetLocale)).length;
}

export function remapPlaceholderLabelsInElements(
  elements: StormElement[],
  targetLocale: Locale,
): StormElement[] {
  return elements.map((el) => remapElementLabelIfPlaceholder(el, targetLocale));
}

export function countRemappablePlaceholderLabelsInViews(
  views: BoardView[],
  targetLocale: Locale,
): number {
  let total = 0;
  for (const view of views) {
    if (!isCanvasBoardView(view)) continue;
    total += countRemappablePlaceholderLabels(view.elements, targetLocale);
  }
  return total;
}
