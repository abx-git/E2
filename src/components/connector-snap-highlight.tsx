"use client";

import {
  boundsForConnectorTarget,
  type ConnectorAttachTarget,
} from "@/lib/connector-target-pick";
import type { BoundedContext, StormElement, Swimlane } from "@/types/storm-element";

export interface ConnectorSnapTargetHighlightProps {
  target: ConnectorAttachTarget;
  valid: boolean;
  elements: StormElement[];
  swimlanes: Swimlane[];
  boundedContexts: BoundedContext[];
  notesCompact?: boolean;
}

export function ConnectorSnapTargetHighlight({
  target,
  valid,
  elements,
  swimlanes,
  boundedContexts,
  notesCompact = false,
}: ConnectorSnapTargetHighlightProps) {
  const bounds = boundsForConnectorTarget(
    target,
    elements,
    swimlanes,
    boundedContexts,
    notesCompact,
  );
  if (!bounds) return null;

  const stroke = valid ? "#2a9d8f" : "#e76f51";
  const rx =
    target.kind === "element" ? 6 : target.kind === "boundedContext" ? 4 : 0;

  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.w}
      height={bounds.h}
      rx={rx}
      fill={stroke}
      fillOpacity={valid ? 0.1 : 0.06}
      stroke={stroke}
      strokeWidth={2}
      strokeDasharray={valid ? "6 4" : "4 3"}
      className="pointer-events-none"
    />
  );
}
