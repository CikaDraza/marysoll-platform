// src/app/api/appointments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { requireAuth } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import {
  reserveVoucherForBooking,
  attachReservationToAppointment,
  computeVoucherDiscount,
} from "@/lib/loyalty/vouchers/service";
import { Voucher } from "@/models/Voucher";
import {
  inferPreferredContact,
  normalizeContactValue,
  normalizeInstagram,
} from "@/lib/contactRules";
import type { IAppointmentService } from "@/types";
import type { ITenant } from "@/models/Tenant"; // Uveri se da imaš ovaj import

export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { decoded } = authResult;

    // Čitaj header-e iz middleware-a
    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug");

    let tenant: ITenant | null = null;
    let tenantId: string | null = null;

    // 1. Probaj naći tenant po slug-u iz header-a
    if (tenantSlug && tenantSlug !== "default" && tenantSlug !== "") {
      // Koristi .lean() ali castuj rezultat
      const tenantDoc = await Tenant.findOne({
        slug: tenantSlug,
        status: "active",
      }).lean();

      if (tenantDoc) {
        tenant = tenantDoc as unknown as ITenant;
      }
    }

    // 2. Ako nema, probaj po tenantId iz tokena
    if (!tenant && decoded.tenantId) {
      const tenantDoc = await Tenant.findById(decoded.tenantId).lean();

      if (tenantDoc) {
        tenant = tenantDoc as unknown as ITenant;
      }
    }

    // 3. Ako i dalje nema, vrati grešku
    if (!tenant) {
      return NextResponse.json(
        { error: "Salon nije pronađen" },
        { status: 404 },
      );
    }

    // Eksplicitno konvertuj _id u string
    tenantId = tenant._id?.toString() || null;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Greška sa ID-em salona" },
        { status: 500 },
      );
    }

    // Provera da li salon može primati zakazivanja
    const now = new Date();
    const trialEndsAt = tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt)
      : null;
    const isTrialActive =
      tenant.isTrialActive && trialEndsAt && trialEndsAt > now;

    const canAcceptBookings =
      tenant.paid === true || isTrialActive === true || tenant.plan === "maria";

    if (!canAcceptBookings) {
      return NextResponse.json(
        { error: "Salon nije aktivan. Zakazivanje nije moguće." },
        { status: 403 },
      );
    }

    const data = await request.json();

    // Growth Studio polja NIKAD ne dolaze od klijenta — spread ...data ispod
    // bi ih inače persistovao (finalPrice/discountAmount računamo server-side).
    delete data.appliedVoucherId;
    delete data.appliedPromotionId;
    delete data.originalPrice;
    delete data.discountAmount;
    delete data.finalPrice;
    delete data.completedAt;
    delete data.completionSource;
    delete data.completionPromptSentAt;
    delete data.loyaltyProcessed;

    const clientPhone = normalizeContactValue(data.clientPhone);
    const clientInstagram = normalizeInstagram(data.clientInstagram);
    const preferredContact =
      data.preferredContact ??
      (clientPhone || clientInstagram
        ? inferPreferredContact({
            phone: clientPhone,
            instagram: clientInstagram,
            fallback: "platform",
          })
        : "platform");
    const contactNote = normalizeContactValue(data.contactNote);

    if (!data.services?.[0]?.serviceId) {
      return NextResponse.json(
        { error: "Nedostaje ID usluge" },
        { status: 400 },
      );
    }

    const service = await Service.findById(data.services[0].serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Usluga nije pronađena" },
        { status: 404 },
      );
    }

    const { date, time } = data;
    const salonProfile = await SalonProfile.findOne({ tenantId })
      .select("cancellationWindowHours")
      .lean<{ cancellationWindowHours?: number }>();
    const cancellationWindowHours =
      typeof salonProfile?.cancellationWindowHours === "number"
        ? salonProfile.cancellationWindowHours
        : 1;

    const existing = await Appointment.findOne({
      tenantId,
      date,
      time,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    });

    if (existing) {
      return NextResponse.json({ error: "Termin je zauzet" }, { status: 400 });
    }

    // ── Growth Studio: vaučer pri bookingu ──
    // CAS rezervacija (active → reserved): od dva konkurentna bookinga istim
    // kodom tačno jedan prolazi. Popust se računa server-side.
    const originalPrice = (data.services as IAppointmentService[]).reduce(
      (sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1),
      0,
    );
    let reservedVoucher = null;
    if (typeof data.voucherCode === "string" && data.voucherCode.trim()) {
      reservedVoucher = await reserveVoucherForBooking({
        tenantId,
        code: data.voucherCode,
        clientTenantUserId: decoded.tenantUserId!,
      });
      if (!reservedVoucher) {
        return NextResponse.json(
          { error: "Vaučer nije važeći ili je već iskorišćen." },
          { status: 400 },
        );
      }
    }
    const discountAmount = reservedVoucher
      ? computeVoucherDiscount(reservedVoucher, data.services)
      : 0;

    const appointment = new Appointment({
      ...data,
      tenantId, // Sada je ovo string
      clientProfileId: decoded.tenantUserId,
      clientPhone,
      clientInstagram,
      preferredContact,
      contactNote,
      cancellationWindowHours,
      cancellationStatus: "can_cancel",
      duration: data.duration,
      services: data.services.map((s: IAppointmentService) => ({
        ...s,
        serviceName: s.serviceName,
        duration: s.duration,
      })),
      unreadCount: { client: 0, admin: 0 },
      ...(reservedVoucher
        ? {
            appliedVoucherId: reservedVoucher._id,
            originalPrice,
            discountAmount,
            finalPrice: Math.max(0, originalPrice - discountAmount),
          }
        : {}),
    });

    try {
      await appointment.save();
    } catch (saveError) {
      // Booking nije uspeo — vrati vaučer klijentu.
      if (reservedVoucher) {
        await Voucher.findOneAndUpdate(
          { _id: reservedVoucher._id, status: "reserved" },
          { $set: { status: "active", reservedAppointmentId: null } },
        ).catch(() => null);
      }
      throw saveError;
    }

    if (reservedVoucher) {
      const voucherId = reservedVoucher._id;
      await attachReservationToAppointment(voucherId, appointment._id).catch(
        async (e) => {
          console.error("[loyalty] attach reservation failed:", e);
          await Voucher.findOneAndUpdate(
            { _id: voucherId, status: "reserved" },
            { $set: { status: "active", reservedAppointmentId: null } },
          ).catch(() => null);
        },
      );
    }

    await createAppointmentNotification(
      {
        _id: appointment._id.toString(),
        tenantId: tenant!._id,
        clientProfileId: appointment.clientProfileId?.toString() ?? "",
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        note: appointment.note,
        clientPhone: appointment.clientPhone,
        clientInstagram: appointment.clientInstagram,
        preferredContact: appointment.preferredContact,
        contactNote: appointment.contactNote,
      },
      "created",
    );

    return NextResponse.json(
      { message: "✅ Termin uspešno kreiran", appointment },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ ERROR:", error);
    return NextResponse.json(
      { error: "Greška pri čuvanju termina", details: String(error) },
      { status: 500 },
    );
  }
}
