/**
 * lib/superadmin/salonMonthlyStats.ts
 *
 * SERVER-ONLY — mesečni profil salona za superadmin statistiku i pricing.
 *
 * Tri odvojena "sata" za termine, sve po Europe/Belgrade mesecu:
 *   - appointmentsScheduled: `Appointment.date` u mesecu (business volume)
 *   - appointmentsCreated:   `createdAt` u mesecu (platform workload / write)
 *   - appointmentsCompleted: `completedAt` u mesecu (obavljen posao)
 * Klijenti i statusne kolone ostaju vezani za datum održavanja.
 * Uz to: trenutno aktivno osoblje i rast potrošnje iz TenantUsageHistory.
 */
import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Tenant } from "@/models/Tenant";
import { TenantUsageHistory } from "@/models/TenantUsageHistory";
import { countActiveStaffByTenant } from "@/lib/team/activeStaff";
import { belgradeToUTC } from "@/lib/utils/belgradeTime";
import {
  computeMonthlyUsageGrowth,
  type UsageHistoryPoint,
} from "@/lib/superadmin/usageGrowth";
import type { SalonMonthStats } from "@/types/superadmin-statistics";

interface ScheduledRow {
  _id: Types.ObjectId;
  total: number;
  clientsBooked: number;
  clientsApproved: number;
  nova: number;
  cekaNaOdobrenje: number;
  zavrsena: number;
  otkazana: number;
  nijeSePojavilo: number;
}

interface CountRow {
  _id: Types.ObjectId;
  count: number;
}

type HistoryRow = UsageHistoryPoint & { tenantId: Types.ObjectId };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** [start, end) granice Beogradskog meseca kao UTC trenuci. */
export function belgradeMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: belgradeToUTC(`${year}-${pad2(month)}-01`, "00:00"),
    end: belgradeToUTC(`${nextYear}-${pad2(nextMonth)}-01`, "00:00"),
  };
}

function scheduledStats(datePrefix: string) {
  return Appointment.aggregate<ScheduledRow>([
    { $match: { date: { $regex: `^${datePrefix}` } } },
    {
      $group: {
        _id: "$tenantId",
        total: { $sum: 1 },
        clientsBookedIds: { $addToSet: "$clientProfileId" },
        clientsApprovedIds: {
          $addToSet: {
            $cond: [
              { $eq: ["$status", "appointment_approved"] },
              "$clientProfileId",
              null,
            ],
          },
        },
        nova: {
          $sum: { $cond: [{ $eq: ["$status", "appointment_approved"] }, 1, 0] },
        },
        cekaNaOdobrenje: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        zavrsena: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        otkazana: {
          $sum: {
            $cond: [{ $eq: ["$status", "appointment_cancelled"] }, 1, 0],
          },
        },
        nijeSePojavilo: {
          $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        clientsBooked: {
          $size: { $setDifference: ["$clientsBookedIds", [null]] },
        },
        clientsApproved: {
          $size: { $setDifference: ["$clientsApprovedIds", [null]] },
        },
      },
    },
    { $project: { clientsBookedIds: 0, clientsApprovedIds: 0 } },
  ]);
}

function countByTenantInRange(
  field: "createdAt" | "completedAt",
  start: Date,
  end: Date,
) {
  return Appointment.aggregate<CountRow>([
    { $match: { [field]: { $gte: start, $lt: end } } },
    { $group: { _id: "$tenantId", count: { $sum: 1 } } },
  ]);
}

async function usageHistoryPoints(
  start: Date,
  end: Date,
): Promise<HistoryRow[]> {
  const project = {
    tenantId: 1,
    capturedAt: 1,
    mongoEstimateMb: 1,
    cloudinaryMb: 1,
    activeStaffCount: 1,
  } as const;
  const [inMonth, previousClose] = await Promise.all([
    TenantUsageHistory.find({ capturedAt: { $gte: start, $lt: end } })
      .select(project)
      .lean<HistoryRow[]>(),
    TenantUsageHistory.aggregate<{ last: HistoryRow }>([
      { $match: { capturedAt: { $lt: start } } },
      { $sort: { capturedAt: -1 } },
      { $group: { _id: "$tenantId", last: { $first: "$$ROOT" } } },
    ]),
  ]);
  return [...previousClose.map((row) => row.last), ...inMonth];
}

export async function getSalonMonthlyStats(input: {
  year: number;
  month: number;
}): Promise<SalonMonthStats[]> {
  const { year, month } = input;
  const { start, end } = belgradeMonthRange(year, month);

  await connectToDB();
  const [scheduled, created, completed, history] = await Promise.all([
    scheduledStats(`${year}-${pad2(month)}`),
    countByTenantInRange("createdAt", start, end),
    countByTenantInRange("completedAt", start, end),
    usageHistoryPoints(start, end),
  ]);

  const historyByTenant = new Map<string, HistoryRow[]>();
  for (const point of history) {
    const key = point.tenantId.toString();
    historyByTenant.set(key, [...(historyByTenant.get(key) ?? []), point]);
  }
  const growthByTenant = new Map(
    [...historyByTenant].map(([tenantId, points]) => [
      tenantId,
      computeMonthlyUsageGrowth(points, start, end),
    ]),
  );

  const scheduledByTenant = new Map(
    scheduled.filter((row) => row._id).map((row) => [row._id.toString(), row]),
  );
  const toCountMap = (rows: CountRow[]) =>
    new Map(
      rows
        .filter((row) => row._id)
        .map((row) => [row._id.toString(), row.count]),
    );
  const createdByTenant = toCountMap(created);
  const completedByTenant = toCountMap(completed);

  // Salon ulazi u pregled ako ima termine po bilo kom satu ili snimak rasta.
  const tenantIds = [
    ...new Set([
      ...scheduledByTenant.keys(),
      ...createdByTenant.keys(),
      ...completedByTenant.keys(),
      ...[...growthByTenant].filter(([, g]) => g).map(([id]) => id),
    ]),
  ];
  if (tenantIds.length === 0) return [];

  const [tenants, staffByTenant] = await Promise.all([
    Tenant.find({ _id: { $in: tenantIds } })
      .select("_id name slug")
      .lean<Array<{ _id: Types.ObjectId; name: string; slug: string }>>(),
    countActiveStaffByTenant(tenantIds),
  ]);
  const tenantById = new Map(tenants.map((t) => [t._id.toString(), t]));

  const stats: SalonMonthStats[] = tenantIds.map((tenantId) => {
    const tenant = tenantById.get(tenantId);
    const row = scheduledByTenant.get(tenantId);
    return {
      tenantId,
      salonName: tenant?.name ?? "Nepoznat salon",
      slug: tenant?.slug ?? "",
      appointmentsScheduled: row?.total ?? 0,
      appointmentsCreated: createdByTenant.get(tenantId) ?? 0,
      appointmentsCompleted: completedByTenant.get(tenantId) ?? 0,
      clientsBooked: row?.clientsBooked ?? 0,
      clientsApproved: row?.clientsApproved ?? 0,
      nova: row?.nova ?? 0,
      cekaNaOdobrenje: row?.cekaNaOdobrenje ?? 0,
      zavrsena: row?.zavrsena ?? 0,
      otkazana: row?.otkazana ?? 0,
      nijeSePojavilo: row?.nijeSePojavilo ?? 0,
      activeStaffCount: staffByTenant.get(tenantId) ?? 0,
      usageGrowth: growthByTenant.get(tenantId) ?? null,
    };
  });

  return stats.sort(
    (a, b) =>
      b.appointmentsScheduled - a.appointmentsScheduled ||
      b.appointmentsCreated - a.appointmentsCreated ||
      a.salonName.localeCompare(b.salonName, "sr-Latn"),
  );
}
