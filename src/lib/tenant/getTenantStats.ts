import { TenantUser } from "@/models/TenantUser";
import { Appointment } from "@/models/Appointment";
import type { TenantStats } from "./tenantStatsUtils";

export type { TenantStats } from "./tenantStatsUtils";
export { formatStatValue } from "./tenantStatsUtils";

export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  const [clientCount, appointmentCount] = await Promise.all([
    TenantUser.countDocuments({ tenantId, role: { $in: ["USER", "GUEST"] } }),
    Appointment.countDocuments({ tenantId }),
  ]);
  return { clientCount, appointmentCount };
}
