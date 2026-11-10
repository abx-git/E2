import type { Metadata } from "next";

import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "E2 embed",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <main className="h-dvh w-full overflow-hidden">{children}</main>
    </AppProviders>
  );
}
