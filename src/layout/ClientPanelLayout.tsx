"use client";

import React from "react";
import Link from "next/link";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { useClientRouting } from "@/hooks/useClientRouting";
import { usePublicSalonProfile } from "@/hooks/useSalonProfile";
import { useLoyaltyMe } from "@/hooks/useLoyalty";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import Backdrop from "@/layout/Backdrop";
import Image from "next/image";

// ─── Nav config ───────────────────────────────────────────────────────────────

export type PanelTab =
  | "Moji Termini"
  | "Zakazivanja"
  | "Nagrade"
  | "Moje Preporuke"
  | "Notifikacije"
  | "Moj Profil";

export const PANEL_TABS: {
  id: PanelTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "Moji Termini",
    label: "Moji Termini",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "Zakazivanja",
    label: "Zakazivanja",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "Nagrade",
    label: "Nagrade",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "Moje Preporuke",
    label: "Preporuke",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "Notifikacije",
    label: "Notifikacije",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "Moj Profil",
    label: "Moj Profil",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface ClientSidebarProps {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  salonName?: string;
  salonLogo?: string | null;
}

function ClientSidebar({
  activeTab,
  onTabChange,
  salonName,
  salonLogo,
}: ClientSidebarProps) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user, logout } = useAuth();
  const { base, tenantSlug } = useClientRouting();
  const { data: tenantSalon } = usePublicSalonProfile(tenantSlug);
  const { data: loyaltyMe } = useLoyaltyMe();
  const isVisible = isExpanded || isHovered || isMobileOpen;

  // "Nagrade" tab: vidljiv kada program teče ILI kada klijent ima istoriju
  // (balans se pokazuje i posle pauziranja programa — poverenje).
  const showLoyaltyTab = Boolean(
    loyaltyMe?.enabled ||
      (loyaltyMe?.account &&
        (loyaltyMe.account.lifetimeHearts > 0 ||
          loyaltyMe.account.lifetimePoints > 0)),
  );
  const visibleTabs = PANEL_TABS.filter(
    (t) => t.id !== "Nagrade" || showLoyaltyTab,
  );
  const effectiveSalonName = salonName || tenantSalon?.name || "Salon";
  const effectiveSalonLogo = salonLogo ?? tenantSalon?.logo ?? null;

  return (
    <aside
      className={[
        "fixed top-0 left-0 flex flex-col h-screen z-50 transition-all duration-300 ease-in-out",
        "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800",
        isExpanded || isMobileOpen
          ? "w-[260px]"
          : isHovered
            ? "w-[260px]"
            : "w-[72px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Salon header */}
      <div
        className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 ${!isVisible ? "justify-center" : ""}`}
      >
        <Link href={`${base}/`} className="flex items-center gap-2.5 min-w-0">
          {effectiveSalonLogo ? (
            <Image
              width={64}
              height={64}
              src={effectiveSalonLogo}
              alt={effectiveSalonName}
              className="w-12 h-12 rounded-xl object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm">
              {effectiveSalonName.charAt(0).toUpperCase()}
            </div>
          )}
          {isVisible && (
            <div className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 dark:text-white leading-none truncate">
                {effectiveSalonName}
              </span>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Klijentski panel
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-none">
        {isVisible && (
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Panel
          </p>
        )}

        {visibleTabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-violet-50 dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow-lg shadow-slate-200 dark:shadow-slate-950"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200",
                !isVisible ? "justify-center" : "",
              ].join(" ")}
            >
              <span
                className={`flex-shrink-0 ${isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-500 dark:text-gray-400"}`}
              >
                {t.icon}
              </span>
              {isVisible && (
                <span className="flex-1 text-left truncate">{t.label}</span>
              )}
            </button>
          );
        })}

        {/* Back to salon */}
        {isVisible && (
          <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
            <Link
              href={`${base}/`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0 text-gray-500"
              >
                <path
                  d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Nazad na salon</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      {isVisible && user && (
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => logout({ tenantSlug })}
              title="Odjavi se"
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Collapsed user */}
      {!isVisible && user && (
        <div className="flex-shrink-0 p-3 border-t border-gray-100 dark:border-gray-800 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {user.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function ClientHeader({ activeTab }: { activeTab: PanelTab }) {
  const { isMobileOpen, isExpanded, toggleSidebar, toggleMobileSidebar } =
    useSidebar();
  const { user } = useAuth();
  const { base } = useClientRouting();

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const tabLabel =
    PANEL_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isMobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path
                d="M1 1h16M1 7h16M1 13h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {tabLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Zdravo,{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {user?.name?.split(" ")[0]}
            </span>{" "}
            👋
          </p>
        </div>
        <ThemeToggleButton />
        <NotificationBell base={base} />
      </div>
    </header>
  );
}

// ─── ClientPanelLayout ────────────────────────────────────────────────────────

interface ClientPanelLayoutProps {
  children: React.ReactNode;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  salonName?: string;
  salonLogo?: string | null;
}

export function ClientPanelLayout({
  children,
  activeTab,
  onTabChange,
  salonName,
  salonLogo,
}: ClientPanelLayoutProps) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[260px]"
      : "lg:ml-[72px]";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <ClientSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        salonName={salonName}
        salonLogo={salonLogo}
      />
      <Backdrop />
      <div
        className={`flex flex-col transition-all duration-300 ease-in-out ${mainMargin}`}
      >
        <ClientHeader activeTab={activeTab} />
        <main className="flex-1 p-4 lg:p-6 max-w-screen-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
