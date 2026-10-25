"use client";

import { useT } from "@/i18n";

export default function OfflinePage() {
  const t = useT();
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("chrome.offlineTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("chrome.offlineMessage")}</p>
      </div>
    </main>
  );
}
