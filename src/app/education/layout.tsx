"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/layout/DashboardLayout";

/**
 * Zaseban Education admin workspace. Ne dodaje tabove u legacy Salon
 * dashboard; capability-aware navigacija i javni activation CTA dolaze tek u
 * kasnijim Edu fazama.
 */
export default function EducationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || (!user.isAdmin && !user.isSuperAdmin))) {
      window.location.replace("/login");
    }
  }, [isLoading, user]);

  if (isLoading || !user || (!user.isAdmin && !user.isSuperAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
