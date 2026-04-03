"use client";

import DashboardLayout from "@/layout/DashboardLayout";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
