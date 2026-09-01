// src/app/api/appointments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { requireAuth } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import {
  reserveVoucherForBooking,
  attachReservationToAppointment,
  computeVoucherDiscount,
} from "@/lib/loyalty/vouchers/service";
import { Voucher } from "@/models/Voucher";
import { trackReferralBooking } from "@/lib/loyalty/referrals";
import {
  inferPreferredContact,
  normalizeContactValue,
  normalizeInstagram,
} from "@/lib/contactRules";
import {
  canAcceptBookings,
  checkSlotAvailability,
  loadBookingProfile,
} from "@/lib/appointments/booking";
import type { IAppointmentService } from "@/types";
import type { ITenant } from "@/models/Tenant"; // Uveri se da imaš ovaj import
import { requireCapability } from "@/lib/platform/capabilities-server";
import { sanitizeAppointmentRequest } from "@/lib/appointments/intake";
import { getTenantFolder } from "@/lib/cloudinary";
import { resolveBookingRequest } from "@/lib/booking/resolveBookingRequest";
import { buildPricingSnapshot } from "@/lib/appointments/pricingSnapshot";
import { BookingError } from "@/lib/booking/errors";

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
    // Capability tenant je auth scope, ne proxy slug. Tenant koji se koristi za
    // zapis mora biti isti scope da header ne bi birao drugi salon.
    if (!decoded.tenantId || decoded.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden: tenant mismatch" }, { status: 403 });
    }
    const denied = await requireCapability(decoded.tenantId, "booking.services");
    if (denied) return denied;

    // Provera da li salon može primati zakazivanja
    if (!canAcceptBookings(tenant)) {
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
    const { profile: salonProfile, cancellationWindowHours } =
      await loadBookingProfile(tenantId);

    // Trajanje i cena dolaze iz kataloga, NIKAD iz zahteva. Klijent koji
    // pošalje `{ duration: 5, price: 1 }` dobija canonical vrednosti.
    let resolved;
    try {
      resolved = await resolveBookingRequest({
        tenantId,
        serviceId: String(data.services[0].serviceId),
        selection: {
          variantName: data.services[0].serviceName,
          extras: (data.services[0].extras ?? []).map(
            (e: { name: string; quantity?: number }) => ({
              name: e.name,
              quantity: e.quantity,
            }),
          ),
        },
      });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof BookingError
              ? err.message
              : "Izbor usluge nije validan.",
        },
        { status: 400 },
      );
    }

    const requestedDuration = resolved.durationMinutes;
    const slotError = await checkSlotAvailability({
      tenantId,
      date,
      time,
      requestedDuration,
      profile: salonProfile,
      // Klijentski tok: mora u radno vreme (admin create-guest ostaje slobodan)
      enforceWorkingHours: true,
    });
    if (slotError) {
      return NextResponse.json({ error: slotError }, { status: 400 });
    }

    // ── Growth Studio: vaučer pri bookingu ──
    // CAS rezervacija (active → reserved): od dva konkurentna bookinga istim
    // kodom tačno jedan prolazi. Popust se računa server-side.
    // Osnovica je CANONICAL iznos iz kataloga, ne zbir onoga što je browser
    // poslao. Kod `on_request` je `null` — cena još ne postoji.
    const canonicalTotal = resolved.pricing.total;
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
    // Vaučer je PRAVILO popusta i ne mora da zna cenu pri rezervaciji. Dok je
    // osnovica nepoznata, dinarski iznos se ne obračunava: `discountAmount: 0`
    // i `finalPrice: 0` bi značili „obračunato nad cenom nula", što nije isto
    // što i „još nije obračunato". Vaučer ostaje rezervisan i čeka quote.
    const voucherPricing =
      canonicalTotal == null
        ? { originalPrice: null, discountAmount: null, finalPrice: null }
        : (() => {
            const discountAmount = reservedVoucher
              ? computeVoucherDiscount(reservedVoucher, [
                  {
                    serviceId: String(data.services[0].serviceId),
                    price: canonicalTotal,
                    quantity: 1,
                  },
                ])
              : 0;
            return {
              originalPrice: canonicalTotal,
              discountAmount,
              finalPrice: Math.max(0, canonicalTotal - discountAmount),
            };
          })();

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
      // `...data` bi ubacio sirov `request` iz browsera — prepiši ga očišćenim.
      request: sanitizeAppointmentRequest(
        data.request,
        await getTenantFolder(tenantId),
      ),
      // Canonical trajanje termina — isto ono kojim je provereno zauzeće.
      duration: resolved.durationMinutes,
      services: data.services.map((s: IAppointmentService, i: number) => ({
        ...s,
        serviceName: s.serviceName,
        // Prva (i jedina) stavka nosi canonical trajanje; klijentska vrednost
        // se ne upisuje da se termin i stavka ne bi razišli.
        duration: i === 0 ? resolved.durationMinutes : s.duration,
      })),
      unreadCount: { client: 0, admin: 0 },
      // Canonical cena — server-generated, browser je ne može podmetnuti.
      pricing: buildPricingSnapshot(resolved.pricing),
      ...(reservedVoucher
        ? {
            appliedVoucherId: reservedVoucher._id,
            ...voucherPricing,
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
      let reservationAttached = true;
      await attachReservationToAppointment(voucherId, appointment._id).catch(
        async (e) => {
          reservationAttached = false;
          console.error("[loyalty] attach reservation failed:", e);
          await Voucher.findOneAndUpdate(
            { _id: voucherId, status: "reserved" },
            { $set: { status: "active", reservedAppointmentId: null } },
          ).catch(() => null);
        },
      );
      if (reservationAttached) {
        await trackReferralBooking({
          tenantId,
          referredTenantUserId: decoded.tenantUserId!,
          appointmentId: appointment._id,
          voucher: reservedVoucher,
        }).catch((e) => {
          console.error("[loyalty] referral booking tracking failed:", e);
        });
      }
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
        request: appointment.request ?? null,
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
