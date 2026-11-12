"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, ExternalLink } from "lucide-react";

import { buildE2InstallCommands, E2_VIEWER_DOCS_URL } from "@/lib/e2-cli-install-commands";
import { writeClipboardText } from "@/lib/system-clipboard";
import { useT } from "@/i18n";

function InstallCommandRow({
  title,
  command,
  onCopy,
  copied,
  copyLabel,
  copiedLabel,
}: {
  title: string;
  command: string;
  onCopy: () => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[0.68rem] font-medium text-[var(--muted)]">{title}</p>
      <div className="flex gap-1.5">
        <pre className="dock-field min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all px-2 py-1.5 font-mono text-[0.68rem] leading-snug">
          {command}
        </pre>
        <button
          type="button"
          className="dock-control shrink-0 self-start rounded-lg px-2 py-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          title={copyLabel}
          aria-label={copyLabel}
          onClick={onCopy}
        >
          <ClipboardCopy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {copied ? <p className="text-[0.65rem] text-[var(--accent-2)]">{copiedLabel}</p> : null}
    </div>
  );
}

export interface LocalInstallPanelProps {
  /** Suggested board filename for example commands (e.g. working file name). */
  boardFileHint?: string | null;
}

export function LocalInstallPanel({ boardFileHint }: LocalInstallPanelProps) {
  const t = useT();
  const commands = useMemo(
    () => buildE2InstallCommands(boardFileHint ?? undefined),
    [boardFileHint],
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    const ok = await writeClipboardText(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    }
  };

  const copiedLabel = t("storage.localInstallCopied");

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-[var(--muted)]">{t("storage.localInstallHint")}</p>
      <p className="text-[0.65rem] text-[var(--muted)]">{t("storage.localInstallNodeHint")}</p>
      <InstallCommandRow
        title={t("storage.localInstallGlobalGithub")}
        command={commands.globalInstallGithub}
        onCopy={() => void copy("globalGithub", commands.globalInstallGithub)}
        copied={copiedKey === "globalGithub"}
        copyLabel={t("storage.localInstallCopy")}
        copiedLabel={copiedLabel}
      />
      <InstallCommandRow
        title={t("storage.localInstallGlobalNpm")}
        command={commands.globalInstallNpm}
        onCopy={() => void copy("globalNpm", commands.globalInstallNpm)}
        copied={copiedKey === "globalNpm"}
        copyLabel={t("storage.localInstallCopy")}
        copiedLabel={copiedLabel}
      />
      <InstallCommandRow
        title={t("storage.localInstallNpxViewer")}
        command={commands.npxViewer}
        onCopy={() => void copy("npxViewer", commands.npxViewer)}
        copied={copiedKey === "npxViewer"}
        copyLabel={t("storage.localInstallCopy")}
        copiedLabel={copiedLabel}
      />
      <InstallCommandRow
        title={t("storage.localInstallNpxExport")}
        command={commands.npxExportJson}
        onCopy={() => void copy("npxExport", commands.npxExportJson)}
        copied={copiedKey === "npxExport"}
        copyLabel={t("storage.localInstallCopy")}
        copiedLabel={copiedLabel}
      />
      <InstallCommandRow
        title={t("storage.localInstallAfterGlobal")}
        command={commands.globalViewer}
        onCopy={() => void copy("e2", commands.globalViewer)}
        copied={copiedKey === "e2"}
        copyLabel={t("storage.localInstallCopy")}
        copiedLabel={copiedLabel}
      />
      <a
        href={E2_VIEWER_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-[var(--accent-2)] hover:underline"
      >
        {t("storage.localInstallDocs")}
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </div>
  );
}
