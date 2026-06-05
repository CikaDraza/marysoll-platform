export interface TenantStats {
  clientCount: number;
  appointmentCount: number;
  completedAppointmentCount: number;
  averageRating: number | null;
  reviewCount: number;
}

function roundDown(n: number): number {
  if (n < 10) return n;
  if (n < 100) return Math.floor(n / 10) * 10;
  return Math.floor(n / 100) * 100;
}

export function formatStatValue(n: number): string {
  const rounded = roundDown(n);
  if (rounded >= 1000) {
    const thousands = Math.floor(rounded / 1000);
    const remainder = rounded % 1000;
    const remainderStr = remainder > 0 ? ` ${String(remainder).padStart(3, "0")}` : " 000";
    return `${thousands}${remainderStr}+`;
  }
  return `${rounded}+`;
}
