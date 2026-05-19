import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marysoll",
  description: "Beauty Salon Platform",
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
              {children}
              <Toaster position="top-center" />
            </QueryProvider>
          </SidebarProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
