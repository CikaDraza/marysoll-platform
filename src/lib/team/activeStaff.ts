import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";

/**
 * Ko se broji kao radna snaga salona za pricing/workload profil.
 *
 * Za razliku od team seat-a (staffSeats.ts), ovde se OWNER računa — vlasnica
 * koja sama radi termine (The Lash Room: 1 salon / 1 radnica) je jedna osoba
 * osoblja. Pozvani (invited) i suspendovani nalozi se ne računaju.
 */
export const ACTIVE_STAFF_ROLES = ["OWNER", "ADMIN", "STAFF"] as const;

export async function countActiveStaffByTenant(
  tenantIds: string[],
): Promise<Map<string, number>> {
  const ids = [...new Set(tenantIds)]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  if (ids.length === 0) return new Map();

  await connectToDB();
  const rows = (await TenantUser.aggregate([
    {
      $match: {
        tenantId: { $in: ids },
        role: { $in: [...ACTIVE_STAFF_ROLES] },
        status: "active",
      },
    },
    { $group: { _id: "$tenantId", count: { $sum: 1 } } },
  ])) as Array<{ _id: Types.ObjectId; count: number }>;

  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}
