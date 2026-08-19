/**
 * blocks/statsItems.ts — tenant metrike u prikazive stavke.
 *
 * Nazivi metrika („Zadovoljnih klijenata", „Urađenih tretmana", „Godina
 * iskustva") su JEDNA činjenica platforme, ne stvar pojedine teme — pa i stoje
 * na jednom mestu. Teme se razlikuju po tome GDE ih prikazuju (theme-2 i
 * theme-3 unutar about sekcije, theme-1 u zasebnoj native sekciji), ne po tome
 * kako se zovu.
 *
 * Ovo NIJE deljeni prezentacioni renderer — samo mapiranje podataka. Izgled
 * ostaje svakoj temi.
 */

import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";

export interface StatItem {
  value: string;
  label: string;
}

export function aboutStatsItems(
  stats: TenantStats | undefined,
  yearsOfExperience?: number,
): StatItem[] | undefined {
  if (!stats) return undefined;

  return [
    { value: formatStatValue(stats.clientCount), label: "Zadovoljnih klijenata" },
    {
      value: formatStatValue(stats.completedAppointmentCount),
      label: "Urađenih tretmana",
    },
    ...(yearsOfExperience
      ? [{ value: `${yearsOfExperience}+`, label: "Godina iskustva" }]
      : []),
  ];
}
