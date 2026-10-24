import type { ElementMetadata, ElementType, StormElement } from "@/types/storm-element";
import { isCloudElementType } from "@/types/storm-element";

export interface ElementAttributeClipboard {
  sourceType: ElementType;
  label: string;
  description?: string;
  metadata: ElementMetadata;
}

export type AttributePasteWarning =
  | { kind: "typeChange"; from: ElementType; to: ElementType }
  | { kind: "labelOverwrite" }
  | { kind: "descriptionOverwrite" }
  | { kind: "targetMetadataLost"; key: keyof ElementMetadata }
  | { kind: "sourceMetadataDropped"; key: keyof ElementMetadata };

export interface ElementAttributePastePlan {
  patch: Partial<StormElement>;
  warnings: AttributePasteWarning[];
}

const UNIVERSAL_METADATA_KEYS: (keyof ElementMetadata)[] = [
  "progressMark",
  "showDescriptionOnCard",
  "showAttributesOnCard",
  "showMethodsOnCard",
  "showWebLinksOnCard",
  "webLinks",
];

const METADATA_KEYS_BY_TYPE: Partial<Record<ElementType, (keyof ElementMetadata)[]>> = {
  note: ["noteColor"],
  customCard: ["customTypeId"],
  hotspot: ["hotspotStatus", "hotspotPriority"],
  domainEvent: ["eventSchema", "isRecurring"],
  aggregate: [
    "eventSchema",
    "attributes",
    "aggregateMethods",
    "aggregateInvariants",
  ],
  entity: ["identityFields", "attributes", "operations"],
  valueObject: ["attributes", "immutable", "operations"],
  domainService: ["operations", "stateless"],
  repository: ["aggregateRootRef", "operations"],
  factory: ["createsRef", "operations"],
  subdomain: ["subdomainKind"],
  rule: ["ruleCriteria"],
  example: ["exampleGiven", "exampleWhen", "exampleThen"],
  question: ["questionStatus"],
  userStory: ["storyPersona", "storyPriority", "storyEstimate", "storyAcceptance"],
  release: ["releaseGoal"],
  slice: ["releaseGoal", "sliceSystems"],
  processActivity: [
    "processRole",
    "processSystem",
    "processInputs",
    "processOutputs",
    "processDuration",
  ],
  processGateway: ["gatewayKind", "gatewayConditions"],
  processStart: ["processTrigger"],
  processEnd: ["processResult"],
  dataEntity: ["dataTableName", "dataUniqueKeys", "identityFields", "attributes"],
  dataAssociation: ["dataCardinality", "dataLeftEntity", "dataRightEntity"],
  c4Container: ["c4Technology"],
  c4Component: ["c4Technology"],
  archComponent: ["c4Technology"],
  link: ["linkKind", "linkUrl", "linkViewId"],
};

export function metadataKeysForElementType(type: ElementType): Set<keyof ElementMetadata> {
  const keys = new Set<keyof ElementMetadata>(UNIVERSAL_METADATA_KEYS);
  for (const key of METADATA_KEYS_BY_TYPE[type] ?? []) keys.add(key);
  if (isCloudElementType(type)) {
    keys.add("c4Technology");
    keys.add("cloudProvider");
  }
  return keys;
}

export function metadataKeyHasValue(
  meta: ElementMetadata | undefined,
  key: keyof ElementMetadata,
): boolean {
  if (!meta) return false;
  const value = meta[key];
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function pickMetadataForType(
  source: ElementMetadata | undefined,
  type: ElementType,
): ElementMetadata | undefined {
  if (!source) return undefined;
  const allowed = metadataKeysForElementType(type);
  const out: ElementMetadata = {};
  for (const key of allowed) {
    if (!metadataKeyHasValue(source, key)) continue;
    (out as Record<string, unknown>)[key] = source[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function extractElementAttributeClipboard(element: StormElement): ElementAttributeClipboard {
  return {
    sourceType: element.type,
    label: element.label,
    description: element.description?.trim() ? element.description.trim() : undefined,
    metadata: structuredClone(element.metadata ?? {}),
  };
}

/** Paste copies type, label, description, and type-valid metadata from the clipboard. */
export function planElementAttributePaste(
  target: StormElement,
  clip: ElementAttributeClipboard,
): ElementAttributePastePlan {
  const resultType = clip.sourceType;
  const resultMeta = pickMetadataForType(clip.metadata, resultType);
  const warnings: AttributePasteWarning[] = [];

  if (target.type !== resultType) {
    warnings.push({ kind: "typeChange", from: target.type, to: resultType });
  }
  if (target.label.trim() && target.label.trim() !== clip.label.trim()) {
    warnings.push({ kind: "labelOverwrite" });
  }
  const targetDesc = target.description?.trim() ?? "";
  const clipDesc = clip.description?.trim() ?? "";
  if (targetDesc && targetDesc !== clipDesc) {
    warnings.push({ kind: "descriptionOverwrite" });
  }

  const resultKeys = metadataKeysForElementType(resultType);
  for (const key of metadataKeysForElementType(target.type)) {
    if (!metadataKeyHasValue(target.metadata, key)) continue;
    if (!resultKeys.has(key) || !metadataKeyHasValue(resultMeta, key)) {
      warnings.push({ kind: "targetMetadataLost", key });
    }
  }

  for (const key of metadataKeysForElementType(clip.sourceType)) {
    if (!metadataKeyHasValue(clip.metadata, key)) continue;
    if (!resultKeys.has(key)) {
      warnings.push({ kind: "sourceMetadataDropped", key });
    }
  }

  const patch: Partial<StormElement> = {
    type: resultType,
    label: clip.label,
    description: clip.description,
    metadata: resultMeta,
  };

  return { patch, warnings };
}

export function attributePasteNeedsConfirmation(warnings: AttributePasteWarning[]): boolean {
  return warnings.length > 0;
}
