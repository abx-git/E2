import type { TranslateFn } from "@/i18n/translate";
import type { MessageKey } from "@/i18n/types";
import type { ActionItemArea, ActionItemStatus } from "@/types/action-item";
import type { LineArrowHead } from "@/types/canvas-annotation";
import type { ConnectorStrokeStyle } from "@/lib/connector-style";
import type { HotspotPriority, ModelingMode } from "@/types/storm-element";
import type { ProgressMark } from "@/lib/progress-mark";
import type { ContextMapPattern, RelationType } from "@/types/storm-relation";

function enumKey<T extends string>(prefix: string, value: T): MessageKey {
  return `${prefix}.${value}` as MessageKey;
}

export function modelingModeLabel(t: TranslateFn, mode: ModelingMode): string {
  return t(enumKey("modelingMode", mode));
}

export function modelingModeShortLabel(t: TranslateFn, mode: ModelingMode): string {
  return t(enumKey("modelingModeShort", mode));
}

export function relationTypeLabel(t: TranslateFn, type: RelationType): string {
  return t(enumKey("relationType", type));
}

export function contextMapPatternLabel(t: TranslateFn, pattern: ContextMapPattern): string {
  return t(enumKey("contextMapPattern", pattern));
}

export function lineArrowHeadLabel(t: TranslateFn, head: LineArrowHead): string {
  return t(enumKey("lineArrowHead", head));
}

export function connectorStrokeStyleLabel(t: TranslateFn, style: ConnectorStrokeStyle): string {
  return t(enumKey("connectorStrokeStyle", style));
}

export function actionItemStatusLabel(t: TranslateFn, status: ActionItemStatus): string {
  return t(enumKey("actionItemStatus", status));
}

export function actionItemAreaLabel(t: TranslateFn, area: ActionItemArea): string {
  return t(enumKey("actionItemArea", area));
}

export function workshopFormatLabel(t: TranslateFn, format: string): string {
  return t(enumKey("workshopFormat", format));
}

export function hotspotPriorityLabel(t: TranslateFn, level: HotspotPriority): string {
  return t(enumKey("hotspotPriority", level));
}

export function progressMarkShortLabel(t: TranslateFn, mark: ProgressMark): string {
  return t(enumKey("progressMarkShort", mark));
}

export function progressMarkLongLabel(t: TranslateFn, mark: ProgressMark): string {
  return t(enumKey("progressMarkLabel", mark));
}
