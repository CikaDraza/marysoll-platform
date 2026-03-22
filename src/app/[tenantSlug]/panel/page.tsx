/**
 * /[tenantSlug]/panel — Klijentski panel.
 *
 * Dostupan samo ulogovanim klijentima.
 * Isti layout kao admin dashboard, ali sa klijentskim tabovima.
 * Auth guard se radi na klijentskoj strani (ne server redirect,
 * jer potrebna je fleksibilnost za klijentski token).
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ClientAppointments from "@/components/client/ClientAppointments";
import AppointmentCalendar from "@/components/client/AppointmentCalendar";
import ClientTestimonials from "@/components/client/ClientTestimonials";
import NotificationSettings from "@/components/settings/NotificationSettings";
import ClientProfile from "@/components/client/ClientProfile";

// ─── Tabs ────────────────────────────────────────────────────────────────────
type PanelTab =
  | "Moji Termini"
  | "Zakazivanja"
  | "Moje Preporuke"
  | "Notifikacije"
  | "Moj Profil";

const TABS: { id: PanelTab; emoji: string }[] = [
  { id: "Moji Termini", emoji: "📋" },
  { id: "Zakazivanja", emoji: "📅" },
  { id: "Moje Preporuke", emoji: "⭐" },
  { id: "Notifikacije", emoji: "🔔" },
  { id: "Moj Profil", emoji: "👤" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClientPanelPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;

  const { user, isLoggedIn, isLoading, logout } = useAuth();

  // Tab from URL param or default
  const tabParam = searchParams.get("tab") as PanelTab | null;
  const [activeTab, setActiveTab] = useState<PanelTab>(
    tabParam && TABS.find((t) => t.id === tabParam) ? tabParam : "Moji Termini"
  );

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace(`/${tenantSlug}/login?from=panel`);
    }
  }, [isLoading, isLoggedIn, router, tenantSlug]);

  // Update URL when tab changes
  function handleTabChange(tab: PanelTab) {
    setActiveTab(tab);
    router.replace(`/${tenantSlug}/panel?tab=${encodeURIComponent(tab)}`, {
      scroll: false,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          Učitavanje...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link
              href={`/${tenantSlug}`}
              className="text-[11px] font-bold text-violet-500 uppercase tracking-widest hover:text-violet-700 transition"
            >
              ← Salon
            </Link>
            <h1 className="text-sm font-bold text-zinc-800 leading-tight mt-0.5">
              Zdravo, {user?.name ?? "klijente"} 👋
            </h1>
          </div>

          <button
            onClick={() => {
              logout();
              router.push(`/${tenantSlug}/login`);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-lg hover:border-zinc-400 transition"
          >
            Odjavi se
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? "border-violet-500 text-violet-700"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {t.emoji}{" "}
              <span className="hidden sm:inline">{t.id}</span>
              <span className="sm:hidden">{t.emoji}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "Moji Termini" && <ClientAppointments />}
        {activeTab === "Zakazivanja" && <AppointmentCalendar />}
        {activeTab === "Moje Preporuke" && <ClientTestimonials />}
        {activeTab === "Notifikacije" && <NotificationSettings />}
        {activeTab === "Moj Profil" && <ClientProfile />}
      </main>
    </div>
  );
}
