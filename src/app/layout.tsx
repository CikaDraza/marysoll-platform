import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { InAppBrowserBanner } from "@/components/shared/InAppBrowserBanner";
import { AddToHomeScreenBanner } from "@/components/shared/AddToHomeScreenBanner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute base for resolving relative OG/Twitter image URLs. Without it,
  // Next falls back to http://localhost:3006 and social previews break in prod.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://marysoll.com",
  ),
  title: "Marysoll",
  description: "Beauty Salon Platform",
  // Bez ovoga browser ne vidi manifest → "Add to Home Screen" pravi običnu
  // prečicu umesto prave PWA instalacije (i beforeinstallprompt se ne okida)
  manifest: "/manifest.json",
  openGraph: {
    images: [
      {
        url: "/create-your-salon.png",
        width: 1200,
        height: 630,
        alt: "Marysoll — Kreirajte vaš salon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/create-your-salon.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr" suppressHydrationWarning data-scroll-behavior="smooth">
      {/* suppressHydrationWarning i na <body>: browser ekstenzije (ColorZilla
          cz-shortcut-listen, Grammarly data-gr-*, LastPass…) ubace atribute u
          <body> pre hidracije → lažni hydration mismatch. Suppress važi samo za
          atribute ovog elementa, ne skriva stvarne mismatch-eve u stablu. */}
      <body className="font-outfit antialiased" suppressHydrationWarning>
        {/* Marketing fontovi — ranije pokvaren @import u globals.css ("https: //"
            sa razmakom → browser ga rešava relativno na CSS fajl → 404 posle
            ~3s koji koči primenu stilova = FOUC). Linkovi u body-ju: React 19
            ih hoistuje u <head>; stylesheet mora precedence da bi se hoistovao. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router
            root layout važi za SVE strane (pravilo cilja Pages Router);
            dugoročni fix je next/font migracija (PLAN-OPTIMIZACIJE 0.7). */}
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Meddon&family=Oswald:wght@200..700&family=Outfit:wght@100..900&display=swap"
        />
        <ThemeProvider>
          <SidebarProvider>
            <QueryProvider>
              <InAppBrowserBanner />
              <AddToHomeScreenBanner />
              {children}
              <Toaster position="top-center" />
            </QueryProvider>
          </SidebarProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
