import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const APP_NAME = "E2";
const APP_DESCRIPTION = "Event Storming — Domänenmodellierung mit lokaler JSON-Persistenz";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1419",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={plex.variable}>
      <body className={`${plex.className} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
