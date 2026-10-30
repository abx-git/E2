import type { StormElement } from "@/types/storm-element";
import type { ElementType } from "@/types/storm-element";

/** Per-view palette visibility: fade hidden element types on the canvas. */

export function isTypeVisibilityFilterActive(
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
): boolean {
  return hiddenElementTypes.length > 0 || hiddenCustomTypeIds.length > 0;
}

export function isElementTypeHidden(
  type: ElementType,
  hiddenElementTypes: readonly ElementType[],
): boolean {
  return hiddenElementTypes.includes(type);
}

export function isCustomCardTypeHidden(
  customTypeId: string | undefined,
  hiddenCustomTypeIds: readonly string[],
): boolean {
  if (!customTypeId) return false;
  return hiddenCustomTypeIds.includes(customTypeId);
}

export function elementDimmedByTypeVisibilityFilter(
  element: Pick<StormElement, "type" | "metadata">,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
): boolean {
  if (!isTypeVisibilityFilterActive(hiddenElementTypes, hiddenCustomTypeIds)) {
    return false;
  }
  if (isElementTypeHidden(element.type, hiddenElementTypes)) return true;
  if (element.type === "customCard") {
    return isCustomCardTypeHidden(element.metadata?.customTypeId, hiddenCustomTypeIds);
  }
  return false;
}

export function relationEndpointsDimmedByTypeVisibilityFilter(
  source: Pick<StormElement, "type" | "metadata">,
  target: Pick<StormElement, "type" | "metadata">,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
): boolean {
  if (!isTypeVisibilityFilterActive(hiddenElementTypes, hiddenCustomTypeIds)) {
    return false;
  }
  const sourceVisible = !elementDimmedByTypeVisibilityFilter(
    source,
    hiddenElementTypes,
    hiddenCustomTypeIds,
  );
  const targetVisible = !elementDimmedByTypeVisibilityFilter(
    target,
    hiddenElementTypes,
    hiddenCustomTypeIds,
  );
  return !sourceVisible && !targetVisible;
}

export function connectorDimmedByTypeVisibilityFilter(
  elements: readonly Pick<StormElement, "id" | "type" | "metadata">[],
  elementInvolved: (elementId: string) => boolean,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
): boolean {
  if (!isTypeVisibilityFilterActive(hiddenElementTypes, hiddenCustomTypeIds)) {
    return false;
  }
  return !elements.some(
    (el) =>
      elementInvolved(el.id) &&
      !elementDimmedByTypeVisibilityFilter(el, hiddenElementTypes, hiddenCustomTypeIds),
  );
}
