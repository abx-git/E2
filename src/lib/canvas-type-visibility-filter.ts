import type { StormElement } from "@/types/storm-element";
import type { ElementType } from "@/types/storm-element";

/** Per-view palette visibility: dim or hide element types on the canvas. */

export type PaletteTypeVisibilityMode = "visible" | "dimmed" | "invisible";

export function isTypeVisibilityFilterActive(
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
  invisibleElementTypes: readonly ElementType[] = [],
  invisibleCustomTypeIds: readonly string[] = [],
): boolean {
  return (
    hiddenElementTypes.length > 0 ||
    hiddenCustomTypeIds.length > 0 ||
    invisibleElementTypes.length > 0 ||
    invisibleCustomTypeIds.length > 0
  );
}

export function isElementTypeHidden(
  type: ElementType,
  hiddenElementTypes: readonly ElementType[],
): boolean {
  return hiddenElementTypes.includes(type);
}

export function isElementTypeInvisible(
  type: ElementType,
  invisibleElementTypes: readonly ElementType[],
): boolean {
  return invisibleElementTypes.includes(type);
}

export function isCustomCardTypeHidden(
  customTypeId: string | undefined,
  hiddenCustomTypeIds: readonly string[],
): boolean {
  if (!customTypeId) return false;
  return hiddenCustomTypeIds.includes(customTypeId);
}

export function isCustomCardTypeInvisible(
  customTypeId: string | undefined,
  invisibleCustomTypeIds: readonly string[],
): boolean {
  if (!customTypeId) return false;
  return invisibleCustomTypeIds.includes(customTypeId);
}

export function paletteBuiltInTypeVisibilityMode(
  type: ElementType,
  hiddenElementTypes: readonly ElementType[],
  invisibleElementTypes: readonly ElementType[],
): PaletteTypeVisibilityMode {
  if (isElementTypeInvisible(type, invisibleElementTypes)) return "invisible";
  if (isElementTypeHidden(type, hiddenElementTypes)) return "dimmed";
  return "visible";
}

export function paletteCustomTypeVisibilityMode(
  customTypeId: string,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
  invisibleElementTypes: readonly ElementType[],
  invisibleCustomTypeIds: readonly string[],
): PaletteTypeVisibilityMode {
  if (
    isCustomCardTypeInvisible(customTypeId, invisibleCustomTypeIds) ||
    isElementTypeInvisible("customCard", invisibleElementTypes)
  ) {
    return "invisible";
  }
  if (
    isCustomCardTypeHidden(customTypeId, hiddenCustomTypeIds) ||
    isElementTypeHidden("customCard", hiddenElementTypes)
  ) {
    return "dimmed";
  }
  return "visible";
}

export function elementInvisibleByTypeVisibilityFilter(
  element: Pick<StormElement, "type" | "metadata">,
  invisibleElementTypes: readonly ElementType[],
  invisibleCustomTypeIds: readonly string[],
): boolean {
  if (isElementTypeInvisible(element.type, invisibleElementTypes)) return true;
  if (element.type === "customCard") {
    if (isElementTypeInvisible("customCard", invisibleElementTypes)) return true;
    return isCustomCardTypeInvisible(element.metadata?.customTypeId, invisibleCustomTypeIds);
  }
  return false;
}

export function elementDimmedByTypeVisibilityFilter(
  element: Pick<StormElement, "type" | "metadata">,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
  invisibleElementTypes: readonly ElementType[] = [],
  invisibleCustomTypeIds: readonly string[] = [],
): boolean {
  if (
    elementInvisibleByTypeVisibilityFilter(
      element,
      invisibleElementTypes,
      invisibleCustomTypeIds,
    )
  ) {
    return false;
  }
  if (
    !isTypeVisibilityFilterActive(
      hiddenElementTypes,
      hiddenCustomTypeIds,
      invisibleElementTypes,
      invisibleCustomTypeIds,
    )
  ) {
    return false;
  }
  if (isElementTypeHidden(element.type, hiddenElementTypes)) return true;
  if (element.type === "customCard") {
    if (isElementTypeHidden("customCard", hiddenElementTypes)) return true;
    return isCustomCardTypeHidden(element.metadata?.customTypeId, hiddenCustomTypeIds);
  }
  return false;
}

function endpointInvisible(
  element: Pick<StormElement, "type" | "metadata">,
  invisibleElementTypes: readonly ElementType[],
  invisibleCustomTypeIds: readonly string[],
): boolean {
  return elementInvisibleByTypeVisibilityFilter(
    element,
    invisibleElementTypes,
    invisibleCustomTypeIds,
  );
}

export function relationHiddenByTypeVisibilityFilter(
  source: Pick<StormElement, "type" | "metadata">,
  target: Pick<StormElement, "type" | "metadata">,
  invisibleElementTypes: readonly ElementType[],
  invisibleCustomTypeIds: readonly string[],
): boolean {
  return (
    endpointInvisible(source, invisibleElementTypes, invisibleCustomTypeIds) ||
    endpointInvisible(target, invisibleElementTypes, invisibleCustomTypeIds)
  );
}

export function relationEndpointsDimmedByTypeVisibilityFilter(
  source: Pick<StormElement, "type" | "metadata">,
  target: Pick<StormElement, "type" | "metadata">,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
  invisibleElementTypes: readonly ElementType[] = [],
  invisibleCustomTypeIds: readonly string[] = [],
): boolean {
  if (
    relationHiddenByTypeVisibilityFilter(
      source,
      target,
      invisibleElementTypes,
      invisibleCustomTypeIds,
    )
  ) {
    return false;
  }
  if (
    !isTypeVisibilityFilterActive(
      hiddenElementTypes,
      hiddenCustomTypeIds,
      invisibleElementTypes,
      invisibleCustomTypeIds,
    )
  ) {
    return false;
  }
  const sourceVisible = !elementDimmedByTypeVisibilityFilter(
    source,
    hiddenElementTypes,
    hiddenCustomTypeIds,
    invisibleElementTypes,
    invisibleCustomTypeIds,
  );
  const targetVisible = !elementDimmedByTypeVisibilityFilter(
    target,
    hiddenElementTypes,
    hiddenCustomTypeIds,
    invisibleElementTypes,
    invisibleCustomTypeIds,
  );
  return !sourceVisible && !targetVisible;
}

export function connectorHiddenByTypeVisibilityFilter(
  elements: readonly Pick<StormElement, "id" | "type" | "metadata">[],
  elementInvolved: (elementId: string) => boolean,
  invisibleElementTypes: readonly ElementType[],
  invisibleCustomTypeIds: readonly string[],
): boolean {
  const involved = elements.filter((el) => elementInvolved(el.id));
  if (involved.length === 0) return false;
  return involved.every((el) =>
    elementInvisibleByTypeVisibilityFilter(el, invisibleElementTypes, invisibleCustomTypeIds),
  );
}

export function connectorDimmedByTypeVisibilityFilter(
  elements: readonly Pick<StormElement, "id" | "type" | "metadata">[],
  elementInvolved: (elementId: string) => boolean,
  hiddenElementTypes: readonly ElementType[],
  hiddenCustomTypeIds: readonly string[],
  invisibleElementTypes: readonly ElementType[] = [],
  invisibleCustomTypeIds: readonly string[] = [],
): boolean {
  if (
    connectorHiddenByTypeVisibilityFilter(
      elements,
      elementInvolved,
      invisibleElementTypes,
      invisibleCustomTypeIds,
    )
  ) {
    return false;
  }
  if (
    !isTypeVisibilityFilterActive(
      hiddenElementTypes,
      hiddenCustomTypeIds,
      invisibleElementTypes,
      invisibleCustomTypeIds,
    )
  ) {
    return false;
  }
  return !elements.some(
    (el) =>
      elementInvolved(el.id) &&
      !elementDimmedByTypeVisibilityFilter(
        el,
        hiddenElementTypes,
        hiddenCustomTypeIds,
        invisibleElementTypes,
        invisibleCustomTypeIds,
      ),
  );
}