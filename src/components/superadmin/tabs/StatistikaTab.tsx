"use client";

import { useMemo } from "react";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import {
  PlanBadge,
  StatusBadge,
  superAdminCardClass as card,
} from "@/components/superadmin/shared";

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
    </div>
  );
}
