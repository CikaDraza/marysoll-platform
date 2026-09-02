import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import { getLoyaltyConfig } from "@/lib/loyalty/config";
import {
  computeClientPeriodInsights,
  statisticsPeriod,
  topClientsForPeriod,
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireTenantAdmin(req);
  if (!auth.success) return auth.response;
  const appointmentsDenied = await requireFeature(auth.tenantId, "appointments");
  if (appointmentsDenied) return appointmentsDenied;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Klijent nije pronađen" }, { status: 404 });
  }

  const month = Number(req.nextUrl.searchParams.get("month")) || new Date().getMonth() + 1;
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  if (month < 1 || month > 12 || year < 2000 || year > 2200) {
    return NextResponse.json({ error: "Nevalidan period" }, { status: 400 });
  }

  await connectToDB();
  const tenantId = new Types.ObjectId(auth.tenantId);
  const clientId = new Types.ObjectId(id);
  const client = await TenantUser.findOne({
    _id: clientId,
    tenantId,
    role: { $in: ["USER", "GUEST"] },
  })
    .select("name email phone instagram tiktok birthday status isEmailVerified createdAt lastActive")
    .lean() as null | {
      _id: Types.ObjectId;
      email: string;
      [key: string]: unknown;
    };
  if (!client) {
    return NextResponse.json({ error: "Klijent nije pronađen" }, { status: 404 });
  }

  const { start, end } = statisticsPeriod(month, year);
  const [allAppointments, periodAppointments, testimonialRows, testimonialCount] =
    await Promise.all([
      Appointment.find({ tenantId, clientProfileId: clientId })
        .sort({ date: -1, time: -1 })
        .lean(),
      Appointment.find({ tenantId, createdAt: { $gte: start, $lt: end } })
        .populate("clientProfileId", "name email")
        .lean(),
      Testimonial.find({ tenantId, clientProfileId: clientId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("rating comment adminReply isApproved createdAt appointmentId")
        .lean(),
      Testimonial.countDocuments({ tenantId, clientProfileId: clientId }),
    ]);

  const clientPeriod = (periodAppointments as unknown as StatisticsAppointment[])
    .filter((appointment) => {
      const profile = appointment.clientProfileId as unknown as { _id?: unknown };
      return String(profile?._id ?? appointment.clientProfileId) === id;
    });
  const appointmentRows = allAppointments as unknown as StatisticsAppointment[];
  const nowKey = new Date().toISOString().slice(0, 10);
  const lastVisit = appointmentRows.find((a) => a.status === "completed") ?? null;
  const nextAppointment = [...appointmentRows]
    .reverse()
    .find((a) => a.date >= nowKey && !["completed", "appointment_cancelled", "appointment_rejected", "no_show"].includes(a.status ?? "")) ?? null;

  const insightsAllowed = (await requireFeature(auth.tenantId, "clientInsights")) === null;
  const periodStats = computeClientPeriodInsights(clientPeriod);
  const topClients = topClientsForPeriod(periodAppointments as unknown as StatisticsAppointment[]);
  const rank = topClients
    .findIndex((entry) => entry.clientId === id);

  const loyaltyCapability = await resolveTenantCapability(auth.tenantId, "loyalty.rewards");
  const loyaltyConfig = loyaltyCapability?.enabled
    ? await getLoyaltyConfig(auth.tenantId)
    : null;
  const loyaltyEnabled = loyaltyCapability?.enabled === true && loyaltyConfig?.enabled === true;
  const loyaltyAccount = loyaltyEnabled
    ? await LoyaltyAccount.findOne({ tenantId, tenantUserId: clientId }).lean() as null | { _id: Types.ObjectId; [key: string]: unknown }
    : null;
  const [ledger, vouchers] = loyaltyAccount
    ? await Promise.all([
        LoyaltyLedger.find({ tenantId, accountId: loyaltyAccount._id })
          .sort({ createdAt: -1 }).limit(50).lean(),
        Voucher.find({ tenantId, ownerTenantUserId: clientId })
          .sort({ createdAt: -1 }).limit(50).lean(),
      ])
    : [[], []];

  return NextResponse.json({
    period: { month, year },
    client,
    appointments: appointmentRows.map((appointment) => ({
      ...appointment,
      potentialValue: getAppointmentPotentialValue(appointment),
      realizedValue: getAppointmentRealizedValue(appointment),
    })),
    insights: {
      available: insightsAllowed,
      ...(insightsAllowed ? {
        potential: periodStats.potential,
        realized: periodStats.realized,
        total: periodStats.total,
        completed: periodStats.completed,
        cancelled: periodStats.cancelled,
        noShow: periodStats.noShow,
        testimonialCount,
        lastVisit: lastVisit ? { date: lastVisit.date, time: lastVisit.time } : null,
        nextAppointment: nextAppointment ? { date: nextAppointment.date, time: nextAppointment.time } : null,
        topThree: rank >= 0 && rank < 3,
        topClients,
        withoutPrice: periodStats.withoutPrice,
      } : {}),
    },
    loyalty: loyaltyEnabled ? { enabled: true, account: loyaltyAccount, ledger, vouchers } : { enabled: false },
    testimonials: testimonialRows,
  });
}
