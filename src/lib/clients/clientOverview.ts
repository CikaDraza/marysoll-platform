import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import { getLoyaltyConfig } from "@/lib/loyalty/config";
import {
  computeClientPeriodInsights,
  statisticsPeriod,
  type StatisticsAppointment,
} from "@/lib/statistics/engine";
import {
  getAppointmentPotentialValue,
  getAppointmentRealizedValue,
} from "@/lib/appointments/pricingSnapshot";
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

interface ClientInsightRows {
  clientPeriodRows: AppointmentRow[];
  topClientRows: TopClientAggregateRow[];
  lastVisit: AppointmentRow | null;
  nextAppointment: AppointmentRow | null;
}

const toIso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const optionalString = (value: string | null | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

async function loadClientInsightRows(input: {
  enabled: boolean;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  start: Date;
  end: Date;
}): Promise<ClientInsightRows> {
  if (!input.enabled) return { clientPeriodRows: [], topClientRows: [], lastVisit: null, nextAppointment: null };
  const appointmentScope = { tenantId: input.tenantId, clientProfileId: input.clientId };
  const today = new Date().toISOString().slice(0, 10);
  const [clientPeriodRows, topClientRows, lastVisit, nextAppointment] = await Promise.all([
    Appointment.find({ ...appointmentScope, createdAt: { $gte: input.start, $lt: input.end } })
      .select("clientProfileId clientName clientEmail status pricing services date time createdAt")
      .lean<AppointmentRow[]>(),
    Appointment.aggregate<TopClientAggregateRow>([
      { $match: { tenantId: input.tenantId, createdAt: { $gte: input.start, $lt: input.end } } },
      { $group: { _id: { profileId: "$clientProfileId", email: "$clientEmail" }, name: { $first: "$clientName" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]),
    Appointment.findOne({ ...appointmentScope, status: "completed" }).select("date time").sort({ date: -1, time: -1 }).lean<AppointmentRow>(),
    Appointment.findOne({ ...appointmentScope, date: { $gte: today }, status: { $nin: ["completed", "appointment_cancelled", "appointment_rejected", "no_show"] } })
      .select("date time").sort({ date: 1, time: 1 }).lean<AppointmentRow>(),
  ]);
  return { clientPeriodRows, topClientRows, lastVisit, nextAppointment };
}

function mapTopClients(rows: readonly TopClientAggregateRow[]) {
  return rows.map((entry) => ({
    clientId: entry._id.profileId ? String(entry._id.profileId) : null,
    name: entry.name ?? entry._id.email ?? "Klijent",
    email: entry._id.email ?? "",
    count: entry.count,
  }));
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
  const [appointmentRows, appointmentCount, insightRows, testimonialRows, testimonialCount, loyaltyCapability] =
    await Promise.all([
      Appointment.find(appointmentScope).select(appointmentFields)
        .sort({ date: -1, time: -1 }).skip(skip).limit(appointmentLimit).lean<AppointmentRow[]>(),
      Appointment.countDocuments(appointmentScope),
      loadClientInsightRows({ enabled: params.insightsAllowed, tenantId, clientId, start, end }),
      Testimonial.find({ tenantId, clientProfileId: clientId })
        .select("rating comment adminReply isApproved createdAt")
        .sort({ createdAt: -1 }).limit(100).lean<TestimonialRow[]>(),
      Testimonial.countDocuments({ tenantId, clientProfileId: clientId }),
      resolveTenantCapability(params.tenantId, "loyalty.rewards"),
    ]);

  const periodStats = computeClientPeriodInsights(insightRows.clientPeriodRows);
  const topClients = mapTopClients(insightRows.topClientRows);
  const topThree = topClients.some((entry) => entry.clientId === params.clientId);

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
          .sort({ createdAt: -1 }).limit(50).lean<Array<{
            _id: Types.ObjectId; entryType: string; currency: "hearts" | "points";
            amount: number; description: string; createdAt: Date;
          }>>(),
        Voucher.find({ tenantId, ownerTenantUserId: clientId })
          .select("code type value serviceName status expiresAt")
          .sort({ createdAt: -1 }).limit(50).lean<Array<{
            _id: Types.ObjectId; code: string; type: string; value: number;
            serviceName?: string; status: string; expiresAt?: Date | null;
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
      potential: periodStats.potential,
      realized: periodStats.realized,
      total: periodStats.total,
      completed: periodStats.completed,
      cancelled: periodStats.cancelled,
      noShow: periodStats.noShow,
      testimonialCount,
      lastVisit: insightRows.lastVisit ? { date: insightRows.lastVisit.date, time: insightRows.lastVisit.time } : null,
      nextAppointment: insightRows.nextAppointment ? { date: insightRows.nextAppointment.date, time: insightRows.nextAppointment.time } : null,
      topThree,
      withoutPrice: periodStats.withoutPrice,
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
      })),
    } : { enabled: false },
    testimonials: {
      items: mapTestimonials(testimonialRows),
      totalCount: testimonialCount,
    },
  };
}
