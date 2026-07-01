import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BackgroundFX } from "@/components/layout/background-fx";
import { SiteChrome } from "@/components/layout/site-chrome";
import { APP } from "@/lib/constants";
import { env } from "@/lib/env";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${APP.name} — World Cup 2026 Watch Party`,
    template: `%s · ${APP.name}`,
  },
  description: APP.description,
  applicationName: APP.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP.name,
  },
  openGraph: {
    title: `${APP.name} — World Cup 2026 Watch Party`,
    description: APP.description,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: APP.name, description: APP.description },
  keywords: ["World Cup 2026", "football", "watch party", "predictions", "live"],
};

export const viewport: Viewport = {
  themeColor: "#06070D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} dark`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>
          <BackgroundFX />
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
