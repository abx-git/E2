"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import { useT } from "@/i18n";

export function BoardDockReopenButton({
  side,
  onOpen,
}: {
  side: "left" | "right";
  onOpen: () => void;
}) {
  const t = useT();
  const label =
    side === "left" ? t("chrome.showElementsPanel") : t("chrome.showPropertiesPanel");
  const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={label}
      aria-label={label}
      className={[
        "absolute top-3 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-solid)] text-[var(--muted)] shadow-dock transition hover:bg-[var(--control)] hover:text-[var(--text)]",
        side === "left" ? "left-2" : "right-2",
      ].join(" ")}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

export function BoardDockHideButton({
  side,
  onHide,
  className = "",
}: {
  side: "left" | "right";
  onHide: () => void;
  className?: string;
}) {
  const t = useT();
  const label =
    side === "left" ? t("chrome.hideElementsPanel") : t("chrome.hidePropertiesPanel");
  const Icon = side === "left" ? PanelLeftClose : PanelRightClose;

  return (
    <button
      type="button"
      onClick={onHide}
      title={label}
      aria-label={label}
      className={[
        "dock-control rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--text)]",
        className,
      ].join(" ")}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
