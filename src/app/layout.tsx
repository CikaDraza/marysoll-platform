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
      <body className="font-outfit antialiased">
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
