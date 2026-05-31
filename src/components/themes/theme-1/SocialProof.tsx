import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";

interface Props {
  tenantStats?: TenantStats;
  yearsOfExperience?: number;
}

export function Theme1SocialProof({ tenantStats, yearsOfExperience }: Props) {
  const stats = tenantStats
    ? [
        { id: 1, name: "Zadovoljnih klijenata", value: formatStatValue(tenantStats.clientCount) },
        { id: 2, name: "Urađenih tretmana", value: formatStatValue(tenantStats.appointmentCount) },
        ...(yearsOfExperience ? [{ id: 3, name: "Godina iskustva", value: `${yearsOfExperience}+` }] : []),
      ]
    : [
        { id: 1, name: "Zadovoljnih klijenata", value: "120+" },
        { id: 2, name: "Urađenih tretmana", value: "800+" },
      ];

  return (
    <div className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] opacity-20" />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="mx-auto flex max-w-xs flex-col gap-y-4"
            >
              <dt className="text-base/7 text-gray-600">{stat.name}</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
