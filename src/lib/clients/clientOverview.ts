import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import { getLoyaltyConfig } from "@/lib/loyalty/config";
import {
  futureActivePotential,
  rankTopClients,
  relationshipRealizedRevenue,
  statisticsPeriod,
  type StatisticsAppointment,
} from "@/lib/statistics/engine";
import {
  getAppointmentPotentialValue,
  getAppointmentRealizedValue,
  presentAppointmentPrice,
} from "@/lib/appointments/pricingSnapshot";
import { BLOCKING_APPOINTMENT_STATUSES } from "@/lib/appointments/occupancy";
import { TenantUser } from "@/models/TenantUser";
import { Appointment } from "@/models/Appointment";
import { Testimonial } from "@/models/Testimonial";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import type { ClientOverview, ClientOverviewQuery } from "@/types/client-overview";

interface ClientRow {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  birthday?: Date | null;
  status?: string;
  isEmailVerified?: boolean;
  createdAt?: Date;
  lastActive?: Date | null;
}

interface AppointmentRow extends StatisticsAppointment {
  _id: Types.ObjectId;
  request?: {
    note?: string;
    referenceUrl?: string;
    attachments?: Array<{ url?: string }>;
  };
}

interface TestimonialRow {
  _id: Types.ObjectId;
  rating?: number;
  comment?: string;
  adminReply?: string | null;
  isApproved?: boolean;
  createdAt?: Date;
}

interface TopClientAggregateRow {
  _id: { profileId?: Types.ObjectId | null; email?: string | null };
  name?: string;
  count: number;
}

interface ClientPeriodComparison {
  topClientRows: TopClientAggregateRow[];
}

interface ClientRelationshipRows {
  potentialRows: AppointmentRow[];
  realizedRows: AppointmentRow[];
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  lastVisit: AppointmentRow | null;
  nextAppointment: AppointmentRow | null;
}

const toIso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const optionalString = (value: string | null | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

async function loadClientPeriodComparison(input: {
  enabled: boolean;
  tenantId: Types.ObjectId;
  start: Date;
  end: Date;
}): Promise<ClientPeriodComparison> {
  if (!input.enabled) return { topClientRows: [] };
  // BEZ `$limit`: rang klijenta koji se gleda ne može da se izračuna iz prve
  // tri stavke. Grupisanje ide po klijentima koji su BOOKIRALI u tom mesecu,
  // pa je rezultat reda veličine mesečnog broja termina — ne cele baze.
  const topClientRows = await Appointment.aggregate<TopClientAggregateRow>([
    { $match: { tenantId: input.tenantId, createdAt: { $gte: input.start, $lt: input.end } } },
    { $group: { _id: { profileId: "$clientProfileId", email: "$clientEmail" }, name: { $first: "$clientName" }, count: { $sum: 1 } } },
    { $sort: { count: -1, "_id.email": 1 } },
  ]);
  return { topClientRows };
}

async function loadClientRelationshipRows(input: {
  enabled: boolean;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
}): Promise<ClientRelationshipRows> {
  if (!input.enabled) return {
    potentialRows: [], realizedRows: [], total: 0, completed: 0,
    cancelled: 0, noShow: 0, lastVisit: null, nextAppointment: null,
  };
  const scope = { tenantId: input.tenantId, clientProfileId: input.clientId };
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  const today = localNow.toISOString().slice(0, 10);
  const time = localNow.toISOString().slice(11, 16);
  const future = { $or: [{ date: { $gt: today } }, { date: today, time: { $gte: time } }] };
  const priceFields = "status pricing services date time";
  const [potentialRows, realizedRows, total, completed, cancelled, noShow, lastVisit, nextAppointment] = await Promise.all([
    Appointment.find({ ...scope, ...future, status: { $in: BLOCKING_APPOINTMENT_STATUSES } }).select(priceFields).lean<AppointmentRow[]>(),
    Appointment.find({ ...scope, $or: [{ status: "completed" }, { "pricing.chargedAmount": { $type: "number" } }] }).select(priceFields).lean<AppointmentRow[]>(),
    Appointment.countDocuments(scope),
    Appointment.countDocuments({ ...scope, status: "completed" }),
    Appointment.countDocuments({ ...scope, status: { $in: ["appointment_cancelled", "appointment_rejected"] } }),
    Appointment.countDocuments({ ...scope, status: "no_show" }),
    Appointment.findOne({ ...scope, status: "completed" }).select("date time").sort({ date: -1, time: -1 }).lean<AppointmentRow>(),
    Appointment.findOne({ ...scope, ...future, status: { $in: BLOCKING_APPOINTMENT_STATUSES } }).select("date time").sort({ date: 1, time: 1 }).lean<AppointmentRow>(),
  ]);
  return { potentialRows, realizedRows, total, completed, cancelled, noShow, lastVisit, nextAppointment };
}

function toRankedClients(rows: readonly TopClientAggregateRow[]) {
  return rows.map((entry) => ({
    clientId: entry._id.profileId ? String(entry._id.profileId) : null,
    name: entry.name ?? entry._id.email ?? "Klijent",
    email: entry._id.email ?? "",
    count: entry.count,
  }));
}

/**
 * Top 3 za period, uz OBAVEZAN red klijenta čiji se dosije gleda.
 *
 * Tabela bez njega odgovara na pitanje koje niko nije postavio: otvorili ste
 * dosije Slađane, a vidite tri druge osobe i nijedan podatak o njoj. Zato se
 * njen red uvek prikazuje — u Top 3 ako joj je tamo mesto, inače dopisan
 * ispod, sa STVARNIM rednim brojem u odnosu na sve klijente.
 *
 * `rank` je POZICIJA u poretku, ne takmičarski rang: kad četvoro ima po jedan
 * termin, ona je četvrta, ne prva. Kad nema nijedan termin u tom mesecu, dolazi
 * odmah iza svih koji ih imaju — otud „8." kad je osmoro bookiralo.
 *
 * Izjednačeni se razrešavaju po mejlu (deterministički), jer redosled među
 * jednakima nije poslovna informacija — bitno je samo da je stabilan.
 */
export function buildTopClients(
  rows: readonly TopClientAggregateRow[],
  viewerClientId: string,
  viewerName: string,
) {
  const ranked = toRankedClients(rows);
  const top = rankTopClients(ranked).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isViewer: entry.clientId === viewerClientId,
  }));

  if (top.some((entry) => entry.isViewer)) return top;

  const viewerIndex = ranked.findIndex((entry) => entry.clientId === viewerClientId);
  const viewer = viewerIndex >= 0 ? ranked[viewerIndex] : null;

  return [
    ...top,
    {
      clientId: viewerClientId,
      name: viewer?.name ?? viewerName,
      email: viewer?.email ?? "",
      // Bez ijednog termina u periodu prikazuje se nula, ne prazno polje.
      count: viewer?.count ?? 0,
      // Nije bookirala → staje odmah iza svih koji jesu.
      rank: viewerIndex >= 0 ? viewerIndex + 1 : ranked.length + 1,
      isViewer: true,
    },
  ];
}

function mapClient(client: ClientRow): ClientOverview["client"] {
  return {
    id: String(client._id), name: client.name ?? "Klijent", email: client.email ?? "",
    phone: optionalString(client.phone), instagram: optionalString(client.instagram),
    tiktok: optionalString(client.tiktok),
    birthday: toIso(client.birthday), status: client.status ?? "active",
    isEmailVerified: client.isEmailVerified ?? false,
    createdAt: toIso(client.createdAt) ?? new Date(0).toISOString(), lastActive: toIso(client.lastActive),
  };
}

function mapAppointment(appointment: AppointmentRow): ClientOverview["appointments"]["items"][number] {
  const request = appointment.request;
  return {
    id: String(appointment._id), serviceName: appointment.serviceName ?? "Nepoznata usluga",
    date: appointment.date, time: appointment.time, status: appointment.status ?? "pending",
    potentialValue: getAppointmentPotentialValue(appointment), realizedValue: getAppointmentRealizedValue(appointment),
    price: presentAppointmentPrice(appointment),
    request: request ? {
      note: request.note,
      referenceUrl: request.referenceUrl,
      attachments: (request.attachments ?? []).flatMap((item) => item.url ? [{ url: item.url }] : []),
    } : null,
  };
}

function mapTestimonials(rows: readonly TestimonialRow[]): ClientOverview["testimonials"]["items"] {
  return rows.map((testimonial) => ({
    id: String(testimonial._id), rating: testimonial.rating ?? 1, comment: testimonial.comment ?? "",
    adminReply: testimonial.adminReply ?? null, isApproved: testimonial.isApproved ?? false,
    createdAt: toIso(testimonial.createdAt) ?? new Date(0).toISOString(),
  }));
}

export async function getClientOverview(params: {
  tenantId: string;
  clientId: string;
  query: ClientOverviewQuery;
  insightsAllowed: boolean;
}): Promise<ClientOverview | null> {
  await connectToDB();
  const tenantId = new Types.ObjectId(params.tenantId);
  const clientId = new Types.ObjectId(params.clientId);
  const client = await TenantUser.findOne({
    _id: clientId,
    tenantId,
    role: { $in: ["USER", "GUEST"] },
  })
    .select("name email phone instagram tiktok birthday status isEmailVerified createdAt lastActive")
    .lean<ClientRow>();
  if (!client) return null;

  const { month, year, appointmentPage, appointmentLimit } = params.query;
  const { start, end } = statisticsPeriod(month, year);
  const appointmentScope = { tenantId, clientProfileId: clientId };
  const appointmentFields = "serviceName date time status pricing services request createdAt clientProfileId clientName clientEmail";
  const skip = (appointmentPage - 1) * appointmentLimit;
  const [appointmentRows, appointmentCount, periodComparison, relationshipRows, testimonialRows, testimonialCount, loyaltyCapability] =
    await Promise.all([
      Appointment.find(appointmentScope).select(appointmentFields)
        .sort({ date: -1, time: -1 }).skip(skip).limit(appointmentLimit).lean<AppointmentRow[]>(),
      Appointment.countDocuments(appointmentScope),
      loadClientPeriodComparison({ enabled: params.insightsAllowed, tenantId, start, end }),
      loadClientRelationshipRows({ enabled: params.insightsAllowed, tenantId, clientId }),
      Testimonial.find({ tenantId, clientProfileId: clientId })
        .select("rating comment adminReply isApproved createdAt")
        .sort({ createdAt: -1 }).limit(100).lean<TestimonialRow[]>(),
      Testimonial.countDocuments({ tenantId, clientProfileId: clientId }),
      resolveTenantCapability(params.tenantId, "loyalty.rewards"),
    ]);

  const topClients = buildTopClients(
    periodComparison.topClientRows,
    params.clientId,
    client.name ?? "Klijent",
  );
  // „U Top 3" znači među prva tri, ne „na listi" — klijent je sada uvek na listi.
  const topThree = topClients.some((entry) => entry.isViewer && entry.rank <= 3);
  const relationshipPotential = futureActivePotential(relationshipRows.potentialRows);
  const relationshipRealized = relationshipRealizedRevenue(relationshipRows.realizedRows);

  const loyaltyConfig = loyaltyCapability?.enabled
    ? await getLoyaltyConfig(params.tenantId)
    : null;
  const loyaltyEnabled = loyaltyCapability?.enabled === true && loyaltyConfig?.enabled === true;
  const loyaltyAccount = loyaltyEnabled
    ? await LoyaltyAccount.findOne({ tenantId, tenantUserId: clientId })
        .select("heartsBalance pointsBalance lifetimeHearts lifetimePoints completedVisits noShows totalSpend lastVisitAt")
        .lean<{
          _id: Types.ObjectId; heartsBalance: number; pointsBalance: number;
          lifetimeHearts: number; lifetimePoints: number; completedVisits: number;
          noShows: number; totalSpend: number; lastVisitAt?: Date | null;
        }>()
    : null;
  const [ledgerRows, voucherRows] = loyaltyAccount
    ? await Promise.all([
        LoyaltyLedger.find({ tenantId, accountId: loyaltyAccount._id })
          .select("entryType currency amount description createdAt")
          .sort({ createdAt: -1 }).limit(10).lean<Array<{
            _id: Types.ObjectId; entryType: string; currency: "hearts" | "points";
            amount: number; description: string; createdAt: Date;
          }>>(),
        Voucher.find({ tenantId, ownerTenantUserId: clientId, status: { $in: ["active", "reserved", "redeemed"] } })
          .select("code type value serviceName status expiresAt reservedAppointmentId redeemedAppointmentId redeemedAt")
          .sort({ createdAt: -1 }).limit(50).lean<Array<{
            _id: Types.ObjectId; code: string; type: string; value: number;
            serviceName?: string; status: string; expiresAt?: Date | null;
            reservedAppointmentId?: Types.ObjectId | null;
            redeemedAppointmentId?: Types.ObjectId | null;
            redeemedAt?: Date | null;
          }>>(),
      ])
    : [[], []];

  const totalPages = Math.ceil(appointmentCount / appointmentLimit);
  return {
    period: { month, year },
    client: mapClient(client),
    appointments: {
      items: appointmentRows.map(mapAppointment),
      pagination: {
        page: appointmentPage,
        limit: appointmentLimit,
        totalCount: appointmentCount,
        totalPages,
        hasNextPage: appointmentPage < totalPages,
        hasPrevPage: appointmentPage > 1,
      },
    },
    insights: params.insightsAllowed ? {
      available: true,
      potential: relationshipPotential,
      realized: relationshipRealized,
      total: relationshipRows.total,
      completed: relationshipRows.completed,
      cancelled: relationshipRows.cancelled,
      noShow: relationshipRows.noShow,
      testimonialCount,
      lastVisit: relationshipRows.lastVisit ? { date: relationshipRows.lastVisit.date, time: relationshipRows.lastVisit.time } : null,
      nextAppointment: relationshipRows.nextAppointment ? { date: relationshipRows.nextAppointment.date, time: relationshipRows.nextAppointment.time } : null,
      topThree,
      withoutPrice: relationshipRows.potentialRows.filter(
        (appointment) => getAppointmentPotentialValue(appointment) == null,
      ).length,
      topClients,
    } : { available: false },
    loyalty: loyaltyEnabled ? {
      enabled: true,
      account: loyaltyAccount ? {
        id: String(loyaltyAccount._id),
        heartsBalance: loyaltyAccount.heartsBalance,
        pointsBalance: loyaltyAccount.pointsBalance,
        lifetimeHearts: loyaltyAccount.lifetimeHearts,
        lifetimePoints: loyaltyAccount.lifetimePoints,
        completedVisits: loyaltyAccount.completedVisits,
        noShows: loyaltyAccount.noShows,
        totalSpend: loyaltyAccount.totalSpend,
        lastVisitAt: toIso(loyaltyAccount.lastVisitAt),
      } : null,
      ledger: ledgerRows.map((entry) => ({
        id: String(entry._id), entryType: entry.entryType, currency: entry.currency,
        amount: entry.amount, description: entry.description,
        createdAt: entry.createdAt.toISOString(),
      })),
      vouchers: voucherRows.map((voucher) => ({
        id: String(voucher._id), code: voucher.code, type: voucher.type,
        value: voucher.value, serviceName: voucher.serviceName ?? "",
        status: voucher.status, expiresAt: toIso(voucher.expiresAt),
        reservedAppointmentId: voucher.reservedAppointmentId ? String(voucher.reservedAppointmentId) : null,
        redeemedAppointmentId: voucher.redeemedAppointmentId ? String(voucher.redeemedAppointmentId) : null,
        redeemedAt: toIso(voucher.redeemedAt),
      })),
    } : { enabled: false },
    testimonials: {
      items: mapTestimonials(testimonialRows),
      totalCount: testimonialCount,
    },
  };
}
