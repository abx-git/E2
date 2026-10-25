"use client";

import { useT } from "@/i18n";

/** Corner ribbon; tooltip warns that the file format may break compatibility. */
export function BetaRibbon() {
  const t = useT();
  const hint = t("chrome.betaHint");
  return (
    <div className="beta-ribbon" aria-hidden={false}>
      <span title={hint} aria-label={hint} tabIndex={0} role="note">
        Beta
      </span>
    </div>
  );
}
