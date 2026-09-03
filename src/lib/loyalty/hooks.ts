import "server-only";

// ─── Growth Studio: integracione tačke sa lifecycle-om termina ────────────────
// Jedina API površina koju postojeće rute pozivaju (jedna linija po ruti).
// Nikad ne baca. Dedup preko atomic claim-a na Appointment.loyaltyProcessed
// (pattern kao reminderSent) + unique index na LoyaltyEvent.
//
// Voucher tranzicije se rade i kada je loyalty u međuvremenu isključen —
// rezervisan vaučer mora da se razreši bez obzira na stanje programa.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { emitLoyaltyEvent } from "./events";
import {
  redeemForAppointment,
  releaseForAppointment,
  unRedeemForAppointment,
} from "./vouchers/service";
import { publishReferralCompletionForAppointment } from "./referrals";
import { getAppointmentRealizedValue } from "@/lib/appointments/pricingSnapshot";
import type { IAppointmentPricing } from "@/types";

interface AppointmentLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  clientProfileId?: Types.ObjectId;
  serviceName?: string;
  finalPrice?: number;
  pricing?: IAppointmentPricing;
  services?: Array<{ price?: number; quantity?: number }>;
  appliedVoucherId?: Types.ObjectId;
  loyaltyProcessed?: {
    completed?: boolean;
    noShow?: boolean;
    revertCount?: number;
  };
}

/**
 * Potrošnja na kojoj se dodeljuju bodovi — STVARNA, posle pogodnosti.
 *
 * Redosled (T1-4, Appointment Checkout):
 *   1. `pricing.chargedAmount` — vlasnica je IZRIČITO upisala koliko je
 *      naplatila. To je poslednja reč i nadjačava svaki obračun: ako je
 *      dogovoreno 3.200 a naplaćeno 3.000, poeni idu na 3.000.
 *   2. `finalPrice` — iznos za naplatu posle vaučera, kad stvarno naplaćeno
 *      nije posebno uneto.
 *   3. canonical realized fallback za zatečene termine.
 *
 * Do T1-4 je `finalPrice` bio prvi, pa je uneto „stvarno naplaćeno" gubilo od
 * vaučerske aritmetike. Checkout sada eksplicitno razlikuje „za naplatu" i
 * „stvarno naplaćeno", pa i knjiženje mora.
 *
 * Nepoznata cena daje 0 potrošnje, ne 0 dinara prihoda — bodovi se prosto ne
 * dodeljuju dok se cena ne sazna.
 */
function appointmentSpend(appt: AppointmentLean, status: string): number {
  const charged = appt.pricing?.chargedAmount;
  if (typeof charged === "number") return charged;
  if (typeof appt.finalPrice === "number") return appt.finalPrice;
  // Status se prosleđuje izričito: projekcija ga ne učitava, a `realized`
  // fallback traži dokaz da je usluga izvršena. Kod reverta merodavan je
  // PRETHODNI status — bodovi koji se poništavaju zarađeni su na completed.
  return getAppointmentRealizedValue({ ...appt, status } as never) ?? 0;
}

export async function loyaltyOnAppointmentStatusChange(
  appointmentId: Types.ObjectId | string,
  previousStatus: string,
  newStatus: string,
  opts?: { source?: "admin" | "auto" },
): Promise<void> {
  try {
    if (previousStatus === newStatus) return;
    await connectToDB();

    const appt = (await Appointment.findById(appointmentId)
      .select(
        "tenantId clientProfileId serviceName finalPrice pricing services appliedVoucherId loyaltyProcessed",
      )
      .lean()) as AppointmentLean | null;
    if (!appt?.clientProfileId) return;

    const id = String(appointmentId);

    // ── Revert: completed → bilo šta drugo ──
    if (previousStatus === "completed" && newStatus !== "completed") {
      const claimed = (await Appointment.findOneAndUpdate(
        { _id: appointmentId, "loyaltyProcessed.completed": true },
        {
          $set: { "loyaltyProcessed.completed": false },
          $inc: { "loyaltyProcessed.revertCount": 1 },
        },
        { new: true },
      ).lean()) as AppointmentLean | null;

      if (claimed) {
        const revertCount = claimed.loyaltyProcessed?.revertCount ?? 1;
        const backTo =
          newStatus === "appointment_approved" || newStatus === "pending"
            ? "reserved"
            : "active";
        await unRedeemForAppointment(id, backTo);
        await emitLoyaltyEvent({
          tenantId: appt.tenantId,
          type: "appointment_completion_reverted",
          sourceType: "appointment",
          sourceId: `${id}:r${revertCount}`,
          subjectTenantUserId: appt.clientProfileId,
          payload: {
          appointmentId: id,
          revertCount,
          spend: appointmentSpend(appt, previousStatus),
        },
        });
      }
    }

    // ── Completion ──
    if (newStatus === "completed") {
      const claimed = (await Appointment.findOneAndUpdate(
        { _id: appointmentId, "loyaltyProcessed.completed": { $ne: true } },
        {
          $set: {
            "loyaltyProcessed.completed": true,
            completedAt: new Date(),
            completionSource: opts?.source ?? "admin",
          },
        },
        { new: true },
      ).lean()) as AppointmentLean | null;
      if (!claimed) return;

      await redeemForAppointment(id);

      const cycle = claimed.loyaltyProcessed?.revertCount ?? 0;
      await emitLoyaltyEvent({
        tenantId: appt.tenantId,
        type: "appointment_completed",
        sourceType: "appointment",
        sourceId: `${id}:c${cycle}`,
        subjectTenantUserId: appt.clientProfileId,
        payload: {
          appointmentId: id,
          spend: appointmentSpend(appt, newStatus),
          serviceName: appt.serviceName,
        },
      });
      await publishReferralCompletionForAppointment({
        tenantId: appt.tenantId,
        appointmentId: id,
        referredTenantUserId: appt.clientProfileId,
        appliedVoucherId: appt.appliedVoucherId,
        cycle,
      });
      return;
    }

    // ── No-show ──
    if (newStatus === "no_show") {
      await releaseForAppointment(id);

      // Flag je once-ever: kazna/streak-reset se primenjuje najviše jednom
      // po terminu, i kroz višestruke revert cikluse.
      const claimed = await Appointment.findOneAndUpdate(
        { _id: appointmentId, "loyaltyProcessed.noShow": { $ne: true } },
        { $set: { "loyaltyProcessed.noShow": true } },
      ).lean();
      if (!claimed) return;

      await emitLoyaltyEvent({
        tenantId: appt.tenantId,
        type: "appointment_no_show",
        sourceType: "appointment",
        sourceId: id,
        subjectTenantUserId: appt.clientProfileId,
        payload: { appointmentId: id },
      });
      return;
    }

    // ── Otkazivanje / odbijanje: oslobodi rezervisan vaučer ──
    if (
      newStatus === "appointment_cancelled" ||
      newStatus === "appointment_rejected"
    ) {
      await releaseForAppointment(id);
    }
  } catch (err) {
    console.error("[loyalty] appointment hook failed:", err);
  }
}

/** Registracija klijenta — welcome bonus (ako je konfigurisan). */
export async function loyaltyOnClientRegistered(
  tenantId: Types.ObjectId | string,
  tenantUserId: Types.ObjectId | string,
): Promise<void> {
  try {
    await emitLoyaltyEvent({
      tenantId,
      type: "client_registered",
      sourceType: "tenant_user",
      sourceId: String(tenantUserId),
      subjectTenantUserId: tenantUserId,
    });
  } catch (err) {
    console.error("[loyalty] register hook failed:", err);
  }
}
