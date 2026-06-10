"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import {
  PlanBadge,
  StatusBadge,
  superAdminCardClass as card,
} from "@/components/superadmin/shared";
import { PlatformUsageSection } from "@/components/superadmin/tabs/PlatformUsageSection";
import type { SalonMonthStats } from "@/app/api/superadmin/appointment-stats/route";

// ─── Appointment stats section ────────────────────────────────────────────────

const MONTH_NAMES = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function AppointmentStatsSection() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useQuery<{ stats: SalonMonthStats[]; month: number; year: number }>({
    queryKey: ["appointment-stats", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/superadmin/appointment-stats?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Greška");
      return res.json() as Promise<{ stats: SalonMonthStats[]; month: number; year: number }>;
    },
    staleTime: 60_000,
  });

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      {/* Header + month/year picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Pregled performansi salona po mesecima</h2>
          <p className="text-slate-400 text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Salon rows */}
      {isLoading && (
        <div className={`${card} text-center py-8 text-slate-400 text-sm`}>Učitavanje...</div>
      )}
      {isError && (
        <div className={`${card} text-center py-8 text-red-400 text-sm`}>Greška pri učitavanju</div>
      )}
      {data?.stats.length === 0 && (
        <div className={`${card} text-center py-8 text-slate-400 text-sm`}>
          Nema termina za {MONTH_NAMES[month - 1]} {year}.
        </div>
      )}
      {data?.stats.map((salon) => (
        <div key={salon.tenantId} className={`${card} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{salon.salonName}</p>
              <p className="text-xs text-slate-500">{salon.slug}</p>
            </div>
            <span className="text-3xl font-black text-white">{salon.total}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 pt-3 border-t border-slate-700">
            <StatCell label="Nova" value={salon.nova} color="text-emerald-400" />
            <StatCell label="Čeka" value={salon.cekaNaOdobrenje} color="text-amber-400" />
            <StatCell label="Završena" value={salon.zavrsena} color="text-blue-400" />
            <StatCell label="Otkazana" value={salon.otkazana} color="text-red-400" />
            <StatCell label="Nije došlo" value={salon.nijeSePojavilo} color="text-slate-400" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatistikaTabProps {
  stats: Record<string, unknown> | undefined;
  tenants: TenantRow[];
}

export function StatistikaTab({ stats, tenants }: StatistikaTabProps) {
  const statusGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    tenants.forEach((tenant) => {
      groups[tenant.status] = (groups[tenant.status] ?? 0) + 1;
    });
    return groups;
  }, [tenants]);

  const planGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    tenants.forEach((tenant) => {
      groups[tenant.plan] = (groups[tenant.plan] ?? 0) + 1;
    });
    return groups;
  }, [tenants]);

  const recentTenants = [...tenants]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  const statCards = [
    { label: "Ukupno salona", value: stats?.totalTenants, color: "text-white" },
    {
      label: "Aktivni",
      value: stats?.activeTenants,
      color: "text-emerald-400",
    },
    { label: "U trialu", value: stats?.trialTenants, color: "text-amber-400" },
    { label: "Plaćeni", value: stats?.paidTenants, color: "text-violet-400" },
    {
      label: "Suspendovani",
      value: stats?.suspendedTenants,
      color: "text-red-400",
    },
    {
      label: "Novi ovaj mesec",
      value: stats?.newThisMonth,
      color: "text-blue-400",
    },
    {
      label: "Novi ove nedelje",
      value: stats?.newThisWeek,
      color: "text-cyan-400",
    },
    {
      label: "Konverzija (%)",
      value: stats?.trialConversionRate ? `${stats.trialConversionRate}%` : "—",
      color: "text-pink-400",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Statistika platforme</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className={card}>
            <p className={`text-3xl font-black ${stat.color}`}>
              {String(stat.value ?? "—")}
            </p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Platform Usage (MongoDB + Cloudinary potrošnja) ── */}
      <PlatformUsageSection />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="font-semibold text-sm mb-3">Po statusu</h3>
          <div className="space-y-2">
            {Object.entries(statusGroups).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <div className="flex items-center gap-2 flex-1 mx-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${tenants.length > 0 ? (count / tenants.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h3 className="font-semibold text-sm mb-3">Po planu</h3>
          <div className="space-y-2">
            {Object.entries(planGroups).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <PlanBadge plan={plan} />
                <div className="flex items-center gap-2 flex-1 mx-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${tenants.length > 0 ? (count / tenants.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold text-sm mb-3">Poslednje registracije</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="pb-2 text-left font-semibold">Salon</th>
                <th className="pb-2 text-left font-semibold">Vlasnik</th>
                <th className="pb-2 text-left font-semibold">Status</th>
                <th className="pb-2 text-left font-semibold">Plan</th>
                <th className="pb-2 text-left font-semibold">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentTenants.map((tenant) => (
                <tr key={tenant._id} className="text-slate-300">
                  <td className="py-2 font-medium">{tenant.name}</td>
                  <td className="py-2">{tenant.owner?.email ?? "—"}</td>
                  <td className="py-2">
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td className="py-2">
                    <PlanBadge plan={tenant.plan} />
                  </td>
                  <td className="py-2">
                    {new Date(tenant.createdAt).toLocaleDateString("sr-RS")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Appointment stats per salon ── */}
      <AppointmentStatsSection />
    </div>
  );
}
