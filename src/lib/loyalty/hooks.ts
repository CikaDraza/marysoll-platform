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
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { emitLoyaltyEvent, emitLoyaltyEventDurable } from "./events";
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
  status?: string;
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

// ─── Identitet ciklusa završetka ─────────────────────────────────────────────
//
// Jedan termin sme da bude završen, vraćen i ponovo završen. Svaki takav
// prolaz je CIKLUS, a `loyaltyProcessed.revertCount` je njegov redni broj.
// Identiteti događaja se izvode ISKLJUČIVO iz njega:
//
//   ciklus N  →  completion `${id}:c${N}`  ↔  revert `${id}:r${N+1}`
//
// Zašto je to važno: identitet revert događaja mora da se može izračunati PRE
// nego što se `revertCount` uveća. Da se prvo uvećava, a upis događaja padne,
// sledeći pokušaj bi računao drugi ciklus i isti revert više nikada ne bi mogao
// da nastane pod istim imenom — kompenzacija bi se tiho izgubila.

/** Redni broj tekućeg ciklusa završetka. */
function completionCycleOf(appointment: AppointmentLean): number {
  return Math.max(0, Math.trunc(appointment.loyaltyProcessed?.revertCount ?? 0));
}

function completionSourceId(appointmentId: string, cycle: number): string {
  return `${appointmentId}:c${cycle}`;
}

/** Revert ciklusa N nosi redni broj N+1 — isti broj koji dobija `revertCount`. */
function revertSourceId(appointmentId: string, cycle: number): string {
  return `${appointmentId}:r${cycle + 1}`;
}

/**
 * Filter koji pogađa tačno određen ciklus.
 *
 * Zatečeni dokumenti mogu biti bez `revertCount` polja, a `{ field: 0 }` u
 * Mongu NE pogađa nepostojeće polje — pa bi CAS na nultom ciklusu tiho
 * promašio baš na najstarijim terminima.
 */
function cycleFilter(cycle: number): Record<string, unknown> {
  if (cycle > 0) return { "loyaltyProcessed.revertCount": cycle };
  return {
    $or: [
      { "loyaltyProcessed.revertCount": 0 },
      { "loyaltyProcessed.revertCount": { $exists: false } },
    ],
  };
}

/**
 * Završetak posete — retry-safe finalizacija loyalty lifecycle-a.
 *
 * ZAŠTO POSTOJI ODVOJENO. Ranije je prvo postavljan `loyaltyProcessed.completed
 * = true` (kao claim protiv dvostruke obrade), pa su TEK ONDA rađeni vaučer i
 * durable događaj — a hook je svaku grešku gutao. Pad posle claim-a ostavljao
 * je trajno neispravno stanje koje niko ne bi popravio:
 *
 *   rezervisan vaučer na završenom terminu, ili
 *   završena poseta bez `appointment_completed` događaja (dakle bez zarade),
 *
 * dok bi svaki sledeći pokušaj video `completed: true` i odustao. Sweeper tu
 * ne pomaže: on retry-uje događaje koji POSTOJE, a ovde događaj nije ni nastao.
 *
 * Sada zastavica znači „finalizacija je durabilno uspostavljena", a ne „počeli
 * smo da pokušavamo". Redosled:
 *
 *   1. vaučer `reserved → redeemed`   (CAS — idempotentno)
 *   2. durable `appointment_completed` (unique sourceId — tačno jednom)
 *   3. referral publish                (idempotentno)
 *   4. TEK ONDA `loyaltyProcessed.completed = true`
 *
 * Svaki korak sme da se ponovi bez posledice, pa ponovni poziv nad već
 * završenim terminom popravlja nedovršenu finalizaciju umesto da je preskoči.
 * Dvostruka zarada nije moguća: nju čuva unique `{tenantId, type, sourceId}`
 * na događaju i idempotency ključ u ledgeru.
 */
export async function finalizeAppointmentCompletion(
  appointmentId: Types.ObjectId | string,
  opts?: { source?: "admin" | "auto" },
): Promise<{ finalized: boolean; alreadyFinalized: boolean }> {
  await connectToDB();
  const id = String(appointmentId);

  const appt = (await Appointment.findById(appointmentId)
    .select(
      "tenantId clientProfileId serviceName status finalPrice pricing services appliedVoucherId loyaltyProcessed",
    )
    .lean()) as AppointmentLean | null;

  // Termin koji nije završen (ili je u međuvremenu vraćen) nema šta da
  // finalizuje — revert putanja ima svoju logiku.
  if (!appt?.clientProfileId || appt.status !== "completed") {
    return { finalized: false, alreadyFinalized: false };
  }
  if (appt.loyaltyProcessed?.completed === true) {
    return { finalized: true, alreadyFinalized: true };
  }

  const cycle = completionCycleOf(appt);

  // Opisna polja se smeju upisati odmah: ona nisu claim i ne odlučuju ništa.
  await Appointment.updateOne(
    { _id: appointmentId, completedAt: { $in: [null, undefined] } },
    {
      $set: {
        completedAt: new Date(),
        completionSource: opts?.source ?? "admin",
      },
    },
  );

  // 1. Vaučer. CAS na `{reservedAppointmentId, status: "reserved"}` — ponovni
  //    poziv nad već iskorišćenim vaučerom ne radi ništa.
  await redeemForAppointment(id);

  // 2. Durable događaj. Baca ako upis padne — bez njega finalizacija NIJE
  //    gotova i zastavica ne sme da se postavi.
  await emitLoyaltyEventDurable({
    tenantId: appt.tenantId,
    type: "appointment_completed",
    sourceType: "appointment",
    sourceId: completionSourceId(id, cycle),
    subjectTenantUserId: appt.clientProfileId,
    payload: {
      appointmentId: id,
      // Ciklus putuje uz događaj da bi obrada mogla da proveri da li termin i
      // dalje predstavlja BAŠ taj završetak (vidi `handleCompleted`).
      cycle,
      spend: appointmentSpend(appt, "completed"),
      serviceName: appt.serviceName,
    },
  });

  // 3. Referral (idempotentan, sa sopstvenim gate-om).
  await publishReferralCompletionForAppointment({
    tenantId: appt.tenantId,
    appointmentId: id,
    referredTenantUserId: appt.clientProfileId,
    appliedVoucherId: appt.appliedVoucherId,
    cycle,
  });

  // 4. Tek sada je finalizacija durabilna — i to samo ako je termin i dalje
  //    završen U ISTOM ciklusu. Revert koji je stigao u međuvremenu ne sme da
  //    dobije zastavicu koja tvrdi da je završetak obrađen.
  await Appointment.updateOne(
    { _id: appointmentId, status: "completed", ...cycleFilter(cycle) },
    { $set: { "loyaltyProcessed.completed": true } },
  );

  return { finalized: true, alreadyFinalized: false };
}

/**
 * Vraćanje završetka — kompenzacija koja se oslanja na DOKAZE, ne na zastavicu.
 *
 * Ranije je ceo revert visio o uslovu `loyaltyProcessed.completed === true`.
 * Otkad zastavica znači „finalizacija je durabilno uspostavljena" (a ne „počeli
 * smo"), postoji prozor u kome je završetak već ostavio trag — vaučer je
 * iskorišćen, durable `appointment_completed` postoji, možda je i obrađen — a
 * zastavica još nije postavljena. Revert u tom trenutku ne bi uradio ništa:
 * vaučer bi ostao `redeemed` na terminu koji više nije završen, a zarađeno bi
 * ostalo neponišteno.
 *
 * Zato se ovde gleda tri nezavisna dokaza da je ciklus ostavio posledicu:
 *   1. vaučer je bio iskorišćen za ovaj termin (CAS vraćanje ga i otkriva);
 *   2. durable `appointment_completed` postoji za TEKUĆI ciklus;
 *   3. zastavica je postavljena.
 *
 * REDOSLED je bitan i namerno je ovakav:
 *
 *   vaučer → durable revert događaj → tek onda `revertCount` i zastavica
 *
 * `revertCount` se uvećava POSLEDNJI zato što iz njega nastaje identitet revert
 * događaja (`r{N+1}`). Da se uvećava prvo, a upis događaja padne, sledeći
 * pokušaj bi računao drugi ciklus i ta kompenzacija se više nikada ne bi mogla
 * napraviti pod istim imenom. Ovako neuspeh ostavlja stanje iz kog retry
 * generiše ISTI događaj, a duplikat je uspeh.
 */
export async function finalizeAppointmentRevert(
  appointmentId: Types.ObjectId | string,
  newStatus: string,
): Promise<{ compensated: boolean }> {
  await connectToDB();
  const id = String(appointmentId);

  const appt = (await Appointment.findById(appointmentId)
    .select(
      "tenantId clientProfileId serviceName status finalPrice pricing services appliedVoucherId loyaltyProcessed",
    )
    .lean()) as AppointmentLean | null;
  if (!appt?.clientProfileId) return { compensated: false };
  // Termin je u međuvremenu vraćen na `completed` — nema šta da se poništava.
  if (appt.status === "completed") return { compensated: false };

  const cycle = completionCycleOf(appt);

  // 1. Vaučer se ispravlja UVEK i bezuslovno: `unRedeemForAppointment` je CAS
  //    i nad nikad iskorišćenim vaučerom je no-op. Uslovljavanje zastavicom
  //    je i bilo uzrok zaglavljenog `redeemed` vaučera.
  const backTo =
    newStatus === "appointment_approved" || newStatus === "pending"
      ? "reserved"
      : "active";
  const unRedeemed = await unRedeemForAppointment(id, backTo);

  const completionEventExists = await LoyaltyEvent.exists({
    tenantId: appt.tenantId,
    type: "appointment_completed",
    sourceId: completionSourceId(id, cycle),
  });

  const hadCompletionEffect =
    Boolean(unRedeemed) ||
    Boolean(completionEventExists) ||
    appt.loyaltyProcessed?.completed === true;

  if (!hadCompletionEffect) {
    // Ciklus nije ostavio nijedan trag; nema šta da se kompenzuje. Zastavica se
    // ipak spušta ako je nekim putem ostala postavljena.
    await Appointment.updateOne(
      { _id: appointmentId, "loyaltyProcessed.completed": true },
      { $set: { "loyaltyProcessed.completed": false } },
    );
    return { compensated: false };
  }

  // 2. Durable kompenzacioni događaj sa determinističkim identitetom r(N+1).
  //    Baca ako upis padne — `revertCount` tada NE sme da se pomeri.
  await emitLoyaltyEventDurable({
    tenantId: appt.tenantId,
    type: "appointment_completion_reverted",
    sourceType: "appointment",
    sourceId: revertSourceId(id, cycle),
    subjectTenantUserId: appt.clientProfileId,
    payload: {
      appointmentId: id,
      revertCount: cycle + 1,
      spend: appointmentSpend(appt, "completed"),
    },
  });

  // 3. Ciklus napreduje TAČNO jednom: CAS na ciklus iz kog je identitet izveden.
  //    Paralelni ili ponovljeni revert vidi već uvećan brojač i ne radi ništa.
  await Appointment.updateOne(
    { _id: appointmentId, ...cycleFilter(cycle) },
    {
      $set: {
        "loyaltyProcessed.completed": false,
        "loyaltyProcessed.revertCount": cycle + 1,
      },
    },
  );

  return { compensated: true };
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
      await finalizeAppointmentRevert(appointmentId, newStatus);
    }

    // ── Completion ──
    if (newStatus === "completed") {
      await finalizeAppointmentCompletion(appointmentId, opts);
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
