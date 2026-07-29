import { generateStormId } from "@/lib/storm-id";
import {
  ACTION_ITEM_AREAS,
  ACTION_ITEM_STATUSES,
  type ActionItem,
  type ActionItemArea,
  type ActionItemStatus,
} from "@/types/action-item";

export function normalizeActionItem(raw: Partial<ActionItem> & { title?: string }): ActionItem | null {
  const title = raw.title?.trim();
  if (!title) return null;
  const status = ACTION_ITEM_STATUSES.includes(raw.status as ActionItemStatus)
    ? (raw.status as ActionItemStatus)
    : "open";
  const area = ACTION_ITEM_AREAS.includes(raw.area as ActionItemArea)
    ? (raw.area as ActionItemArea)
    : "followUp";
  return {
    id: raw.id?.trim() || generateStormId(),
    title,
    notes: raw.notes?.trim() || undefined,
    status,
    area,
    elementId: raw.elementId?.trim() || undefined,
    boundedContextId: raw.boundedContextId?.trim() || undefined,
  };
}

export function normalizeActionItems(raw: unknown): ActionItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ActionItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const normalized = normalizeActionItem(entry as Partial<ActionItem>);
    if (normalized) items.push(normalized);
  }
  return items;
}
