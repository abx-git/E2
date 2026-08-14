"use client";

import { I18nProvider } from "@/i18n/provider";

/** Client boundary so the root layout can stay a Server Component. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
