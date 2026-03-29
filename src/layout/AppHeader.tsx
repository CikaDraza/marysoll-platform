"use client";

import React from "react";
import Link from "next/link";
import { useSidebar } from "@/context/SidebarContext";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";
import { useAuth } from "@/hooks/useAuth";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";

const AppHeader: React.FC = () => {
  const { isMobileOpen, isExpanded, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const tenant = useTenantAdmin();

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const salonUrl = tenant.getTenantUrl?.();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-10 h-10 text-gray-500 rounded-xl hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isMobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M1 1h16M1 7h16M1 13h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Salon name breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            Admin panel
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Salon website */}
        {salonUrl && (
          <Link
            href={salonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-xl hover:bg-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/20 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Sajt
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
        )}

        <ThemeToggleButton />
        <NotificationBell />
        <AuthStatusButton theme="light" logoutRedirect="/login" />
      </div>
    </header>
  );
};

export default AppHeader;
