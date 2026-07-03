import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardBeacon } from "@/components/shared/DashboardBeacon";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardBeacon />
      {children}
    </>
  );
}
