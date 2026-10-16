import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";
import type { LineArrowHead } from "@/types/canvas-annotation";
import { LINE_ARROW_HEAD_LABELS } from "@/types/canvas-annotation";

export function connectorArrowHeadGlyph(head: LineArrowHead): string {
  switch (head) {
    case "end":
      return "→";
    case "start":
      return "←";
    case "both":
      return "↔";
    default:
      return "→";
  }
}

export function ConnectorArrowHeadIcon({
  head,
  className = "h-3.5 w-3.5",
}: {
  head: LineArrowHead;
  className?: string;
}) {
  const resolved = head === "none" ? "end" : head;
  if (resolved === "start") return <ArrowLeft className={className} aria-hidden />;
  if (resolved === "both") return <ArrowLeftRight className={className} aria-hidden />;
  return <ArrowRight className={className} aria-hidden />;
}

export function connectorArrowHeadLabel(head: LineArrowHead): string {
  if (head === "none") return LINE_ARROW_HEAD_LABELS.end;
  return LINE_ARROW_HEAD_LABELS[head];
}
