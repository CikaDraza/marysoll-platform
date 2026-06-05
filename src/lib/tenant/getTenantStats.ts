import { Types } from "mongoose";
import { TenantUser } from "@/models/TenantUser";
import { Appointment } from "@/models/Appointment";
import { Testimonial } from "@/models/Testimonial";
import type { TenantStats } from "./tenantStatsUtils";

export type { TenantStats } from "./tenantStatsUtils";
export { formatStatValue } from "./tenantStatsUtils";

export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  const [clientCount, appointmentCount, completedAppointmentCount, ratingAgg] =
    await Promise.all([
      TenantUser.countDocuments({ tenantId, role: { $in: ["USER", "GUEST"] } }),
      Appointment.countDocuments({ tenantId }),
      Appointment.countDocuments({ tenantId, status: "completed" }),
      Testimonial.aggregate([
        { $match: { tenantId: new Types.ObjectId(tenantId), isApproved: true } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);

  const aggResult = ratingAgg[0] as
    | { avg: number; count: number }
    | undefined;

  return {
    clientCount,
    appointmentCount,
    completedAppointmentCount,
    averageRating: aggResult ? Math.round(aggResult.avg * 10) / 10 : null,
    reviewCount: aggResult?.count ?? 0,
  };
}
