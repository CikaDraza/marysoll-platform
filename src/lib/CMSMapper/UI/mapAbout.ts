import { HeroImage, LandingStructure } from "@/types";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";

export function mapAbout(ls: LandingStructure | undefined, tenantStats?: TenantStats) {
  const about = ls?.landing?.about;

  const stats: { label: string; value: string }[] = [];

  if (tenantStats) {
    stats.push({ label: "Zadovoljnih klijenata", value: formatStatValue(tenantStats.clientCount) });
    stats.push({ label: "Urađenih tretmana", value: formatStatValue(tenantStats.appointmentCount) });
  }

  if (about?.yearsOfExperience != null && about.yearsOfExperience > 0) {
    stats.push({ label: "Godina iskustva", value: `${about.yearsOfExperience}+` });
  }

  return {
    headline: about?.headline ?? "Passion for perfection",
    paragraphs:
      about?.paragraphs && about.paragraphs.length > 0
        ? about.paragraphs
        : ["Default salon description"],
    links: about?.links ?? [],
    stats,
    image: about?.image ?? ({ src: "", alt: "Salon interior with stylist and client" } as HeroImage),
    alt: about?.image?.alt ?? "Salon interior with stylist and client",
    enabled: about !== undefined ? about.enabled : true,
  };
}
