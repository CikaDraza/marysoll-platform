"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[260px]"
      : "lg:ml-[72px]";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <AppSidebar />
      <Backdrop />
      <div
        className={`flex flex-col transition-all duration-300 ease-in-out ${mainMargin}`}
      >
        <AppHeader />
        <main className="flex-1 p-4 lg:p-6 max-w-screen-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
