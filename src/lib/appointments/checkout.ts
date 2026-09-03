import "server-only";

/**
 * Appointment Checkout — završetak termina kao RAČUN, ne kao gola promena
 * statusa (T1-4).
 *
 * „Došla" je do sada bila jedan klik i, opciono, jedan broj. Sa pogodnostima
 * to više nije dovoljno: vlasnica mora da vidi šta je cena pre pogodnosti, šta
 * pogodnost skida, koliko treba da naplati i šta klijentkinja time zarađuje.
 *
 * ČETIRI RAZLIČITE ČINJENICE, i nijedna nije druga:
 *
 *   pricing.quote          cena koju je salon potvrdio PRE pogodnosti
 *   originalPrice          pre-benefit ukupno (vaučerska aritmetika)
 *   finalPrice             očekivano za naplatu POSLE pogodnosti
 *   pricing.chargedAmount  STVARNO naplaćeno
 *
 * Sav obračun je server-side. React prikazuje DTO i ne radi `3500 - 500`, niti
 * računa poene: prikazan iznos koji se razlikuje od proknjiženog je gori od
 * nikakvog iznosa.
 */

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { Voucher } from "@/models/Voucher";
import { isLoyaltyActive } from "@/lib/loyalty/events";
import { describeReward } from "@/lib/loyalty/descriptions";
import { LoyaltyRedemptionError } from "@/lib/loyalty/errors";
import { finalizeAppointmentCompletion } from "@/lib/loyalty/hooks";
import {
  BENEFIT_CLEAR_UNSET,
  commitBenefitRecompute,
  planBenefitRecompute,
  type BenefitPricedAppointment,
} from "@/lib/loyalty/redemption";
import {
  applyChargedAmount,
  applyQuotedTotal,
  emptyPricingSnapshot,
  getAppointmentPreBenefitBasis,
} from "./pricingSnapshot";
import { formatServicePrice, PRICE_ON_REQUEST_LABEL } from "@/helpers/formatPrice";
import type { IAppointmentPricing } from "@/types";

// ─── Ulaz ─────────────────────────────────────────────────────────────────────

/** Checkout je ADMIN radnja: klijent ne sme sam da završi svoj termin. */
export interface CheckoutActor {
  tenantId: string;
  adminTenantUserId?: string | null;
}

export interface CheckoutAmounts {
  /**
   * UKUPNA dogovorena cena pre pogodnosti, kako je vlasnica vidi na računu.
   * Server iz nje izvodi canonical quote polja — ona ne razmišlja
   * „osnovica + doplate".
   */
  agreedPrice?: number | null;
  /** Stvarno naplaćeno; ako izostane, podrazumeva se iznos za naplatu. */
  chargedAmount?: number | null;
}

// ─── DTO ──────────────────────────────────────────────────────────────────────

export interface CheckoutBenefitView {
  voucherId: string;
  code: string;
  label: string;
  origin: string;
  /** `reserved` = čeka completion; `redeemed` = već iskorišćen. */
  status: string;
}

export interface CheckoutExpectedEarning {
  hearts: number;
  points: number;
  /** Dnevni anti-abuse limit bi umanjio iznos — prikaz nije garancija. */
  capped: boolean;
}

export interface CheckoutPreview {
  currency: string;
  /** Cena pre pogodnosti; `null` = još nije poznata. */
  priceBeforeBenefit: number | null;
  priceBeforeBenefitLabel: string;
  /** Odakle je iznos: potvrđen quote, katalog, zatečene stavke ili ništa. */
  priceBeforeBenefitSource: "agreed" | "quote" | "catalog" | "legacy" | "unknown";
  /**
   * Postoji pogodnost, a nema potvrđene pre-benefit cene — checkout MORA da
   * pita za dogovorenu cenu pre nego što uopšte može da izračuna popust.
   */
  requiresAgreedPrice: boolean;
  benefit: CheckoutBenefitView | null;
  discountAmount: number | null;
  amountDue: number | null;
  /** Predlog za polje „Stvarno naplaćeno". */
  chargedAmountDefault: number | null;
  /** Preview, ne knjiženje: ledger ostaje autoritet. */
  expectedEarning: CheckoutExpectedEarning;
  loyaltyEnabled: boolean;
  alreadyCompleted: boolean;
}

interface CheckoutAppointment extends BenefitPricedAppointment {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  clientProfileId?: Types.ObjectId;
  status: string;
  serviceName?: string;
  appliedVoucherId?: Types.ObjectId | null;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
}

const CHECKOUT_FIELDS =
  "tenantId clientProfileId status serviceName services pricing appliedVoucherId originalPrice discountAmount finalPrice";

async function loadForCheckout(
  appointmentId: string,
  actor: CheckoutActor,
): Promise<CheckoutAppointment> {
  if (!Types.ObjectId.isValid(appointmentId)) {
    throw new LoyaltyRedemptionError("NOT_FOUND", "Termin nije pronađen.");
  }
  const appointment = await Appointment.findOne({
    _id: new Types.ObjectId(appointmentId),
    tenantId: new Types.ObjectId(actor.tenantId),
  })
    .select(CHECKOUT_FIELDS)
    .lean<CheckoutAppointment>();
  if (!appointment) {
    throw new LoyaltyRedemptionError("NOT_FOUND", "Termin nije pronađen.");
  }
  return appointment;
}

/**
 * Da li je pre-benefit cena POTVRĐENA, a ne samo procenjena.
 *
 * `from` bez quote-a nije potvrđena cena nego donja granica: popust nad njom
 * bi tvrdio konačan iznos koji niko nije dogovorio.
 */
function hasConfirmedPreBenefitPrice(pricing: IAppointmentPricing | null | undefined): boolean {
  if (!pricing) return false;
  if (typeof pricing.quotedTotal === "number") return true;
  return pricing.mode === "fixed" && typeof pricing.minimumTotal === "number";
}

/**
 * Sme li se termin završiti bez dodatnog unosa cene.
 *
 * Ovo je SERVER invariant, ne UI pravilo. Preview vraća `requiresAgreedPrice`
 * i dugme se zaključa, ali ruta se sme pozvati i direktno, a auto-complete je
 * poziva bez ijednog iznosa. Bez ove provere bi termin sa vaučerom mogao da
 * bude završen nad cenom koju niko nije dogovorio:
 *
 *   `on_request` → popust se nikad ne bi ni izračunao (sve ostaje `null`);
 *   `from`       → popust bi pao na MINIMUM, a minimum nije dogovor nego
 *                  donja granica.
 *
 * Fiksna poznata cena ne traži potvrdu — ona JESTE dogovor.
 */
function needsAgreedPriceForCompletion(input: {
  hasBenefit: boolean;
  pricing: IAppointmentPricing | null | undefined;
  agreedPrice: number | null;
}): boolean {
  if (!input.hasBenefit) return false;
  if (input.agreedPrice != null) return false;
  return !hasConfirmedPreBenefitPrice(input.pricing);
}

function basisSource(
  pricing: IAppointmentPricing | null | undefined,
  agreed: number | null,
): CheckoutPreview["priceBeforeBenefitSource"] {
  if (agreed != null) return "agreed";
  if (!pricing) return "legacy";
  if (typeof pricing.quotedTotal === "number") return "quote";
  if (pricing.mode === "on_request") return "unknown";
  return typeof pricing.minimumTotal === "number" ? "catalog" : "unknown";
}

/**
 * Šta klijentkinja zarađuje ovim završetkom.
 *
 * Ista pravila kao `engine.handleCompleted`, uključujući dnevne limite — inače
 * bi vlasnica obećala „+30 ⭐", a ledger proknjižio manje.
 */
async function expectedEarning(input: {
  tenantId: Types.ObjectId;
  clientProfileId?: Types.ObjectId;
  spend: number | null;
}): Promise<{ earning: CheckoutExpectedEarning; enabled: boolean }> {
  const { active, config } = await isLoyaltyActive(String(input.tenantId));
  if (!active || !config || !input.clientProfileId) {
    return { earning: { hearts: 0, points: 0, capped: false }, enabled: false };
  }

  const hearts = config.currencies.hearts.enabled
    ? Math.max(0, Math.trunc(config.earning.heartsPerCompletedVisit))
    : 0;
  const points =
    config.currencies.points.enabled &&
    config.currencies.points.per100Rsd > 0 &&
    (input.spend ?? 0) > 0
      ? Math.floor(((input.spend ?? 0) / 100) * config.currencies.points.per100Rsd)
      : 0;

  if (hearts === 0 && points === 0) {
    return { earning: { hearts: 0, points: 0, capped: false }, enabled: true };
  }

  const account = await LoyaltyAccount.findOne({
    tenantId: input.tenantId,
    tenantUserId: input.clientProfileId,
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  if (!account) {
    return { earning: { hearts, points, capped: false }, enabled: true };
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const earnedToday = await LoyaltyLedger.aggregate([
    {
      $match: {
        accountId: account._id,
        entryType: "earn",
        createdAt: { $gte: dayStart },
      },
    },
    { $group: { _id: "$currency", total: { $sum: "$amount" } } },
  ]);
  const usedHearts = earnedToday.find((row) => row._id === "hearts")?.total ?? 0;
  const usedPoints = earnedToday.find((row) => row._id === "points")?.total ?? 0;

  const cappedHearts = Math.max(
    0,
    Math.min(hearts, config.antiAbuse.maxHeartsPerDay - usedHearts),
  );
  const cappedPoints = Math.max(
    0,
    Math.min(points, config.antiAbuse.maxPointsPerDay - usedPoints),
  );

  return {
    earning: {
      hearts: cappedHearts,
      points: cappedPoints,
      capped: cappedHearts !== hearts || cappedPoints !== points,
    },
    enabled: true,
  };
}

/**
 * Read-only pregled računa. Ne menja ništa — sme se zvati na svaku promenu
 * unosa u modalu.
 */
export async function previewAppointmentCheckout(input: {
  appointmentId: string;
  actor: CheckoutActor;
  amounts?: CheckoutAmounts;
}): Promise<CheckoutPreview> {
  await connectToDB();
  const appointment = await loadForCheckout(input.appointmentId, input.actor);
  const currency = appointment.pricing?.currency ?? "RSD";

  const agreed =
    typeof input.amounts?.agreedPrice === "number" &&
    Number.isFinite(input.amounts.agreedPrice) &&
    input.amounts.agreedPrice >= 0
      ? Math.round(input.amounts.agreedPrice)
      : null;

  // Projektovano stanje: cena koju bi termin dobio ako vlasnica potvrdi ovaj
  // unos. Preview mora da računa nad njom, ne nad zatečenom.
  const projectedPricing =
    agreed != null
      ? applyQuotedTotal(
          appointment.pricing ?? emptyPricingSnapshot(currency),
          agreed,
          input.actor.adminTenantUserId ?? null,
        )
      : (appointment.pricing ?? null);

  const voucher = appointment.appliedVoucherId
    ? await Voucher.findById(appointment.appliedVoucherId)
        .select("code type value serviceScope serviceName origin status")
        .lean<{
          _id: Types.ObjectId;
          code: string;
          type: "percent" | "fixed" | "free_service";
          value: number;
          serviceScope?: Types.ObjectId[];
          serviceName?: string;
          origin: string;
          status: string;
        }>()
    : null;

  const plan = await planBenefitRecompute({
    appliedVoucherId: appointment.appliedVoucherId,
    pricing: projectedPricing,
    services: appointment.services,
  });

  const basis = getAppointmentPreBenefitBasis({
    pricing: projectedPricing,
    services: appointment.services,
  });
  const benefitPricing = plan.set ?? null;
  const discountAmount = benefitPricing?.discountAmount ?? (voucher ? null : 0);
  const amountDue =
    benefitPricing?.finalPrice ?? (voucher ? null : basis);

  const requiresAgreedPrice =
    Boolean(voucher) && agreed == null && !hasConfirmedPreBenefitPrice(appointment.pricing);

  const charged =
    typeof input.amounts?.chargedAmount === "number" &&
    Number.isFinite(input.amounts.chargedAmount) &&
    input.amounts.chargedAmount >= 0
      ? Math.round(input.amounts.chargedAmount)
      : null;
  const chargedAmountDefault = charged ?? amountDue;

  const { earning, enabled } = await expectedEarning({
    tenantId: appointment.tenantId,
    clientProfileId: appointment.clientProfileId,
    spend: chargedAmountDefault,
  });

  return {
    currency,
    priceBeforeBenefit: basis,
    priceBeforeBenefitLabel:
      basis == null
        ? PRICE_ON_REQUEST_LABEL
        : formatServicePrice(basis, "fixed", currency),
    priceBeforeBenefitSource: basisSource(appointment.pricing, agreed),
    requiresAgreedPrice,
    benefit: voucher
      ? {
          voucherId: String(voucher._id),
          code: voucher.code,
          label: describeReward(voucher),
          origin: voucher.origin,
          status: voucher.status,
        }
      : null,
    discountAmount,
    amountDue,
    chargedAmountDefault,
    expectedEarning: earning,
    loyaltyEnabled: enabled,
    alreadyCompleted: appointment.status === "completed",
  };
}

// ─── Završetak ────────────────────────────────────────────────────────────────

export interface CheckoutResult {
  appointmentId: string;
  status: "completed";
  pricing: IAppointmentPricing | null;
  discountAmount: number | null;
  finalPrice: number | null;
  chargedAmount: number | null;
  /** Termin je već bio završen — retry, ne dupla obrada. */
  alreadyCompleted: boolean;
}

/**
 * JEDINI canonical put do `status: "completed"`.
 *
 * Redosled je poslovni, ne tehnički:
 *
 *   1. dogovorena pre-benefit cena (ako je vlasnica unosi sada);
 *   2. server recompute popusta nad tom cenom;
 *   3. stvarno naplaćeno;
 *   4. atomic prelaz u `completed` (uslov na prethodni status je ograda protiv
 *      dvostruke obrade i protiv trke sa auto-complete cronom);
 *   5. loyalty hook: `reserved → redeemed` + durable `appointment_completed`.
 *
 * Zarada se knjiži TEK iz koraka 5, iz durable eventa — redemption sam po sebi
 * nikad ne glumi završetak posete.
 *
 * Auto-complete prosleđuje `source: "auto"` i NIJEDAN iznos: mašina ne
 * izmišlja cenu koju čovek nije rekao.
 */
export async function completeAppointmentCheckout(input: {
  appointmentId: string;
  actor: CheckoutActor;
  amounts?: CheckoutAmounts;
  source?: "admin" | "auto";
  /** Prelaz prolazi samo iz ovog statusa (koristi ga cron). */
  expectedFromStatus?: string;
}): Promise<CheckoutResult> {
  await connectToDB();
  const appointment = await loadForCheckout(input.appointmentId, input.actor);

  if (appointment.status === "completed") {
    // Ponovni poziv nad već završenim terminom NE sme da samo odustane:
    // finalizacija je mogla ostati nedovršena (vaučer još `reserved`, događaj
    // neupisan). `finalizeAppointmentCompletion` je idempotentna i popravlja
    // tačno to; ako je sve već gotovo, ne radi ništa.
    await finalizeAppointmentCompletion(appointment._id, {
      source: input.source ?? "admin",
    });
    return {
      appointmentId: String(appointment._id),
      status: "completed",
      pricing: appointment.pricing ?? null,
      discountAmount: appointment.discountAmount ?? null,
      finalPrice: appointment.finalPrice ?? null,
      chargedAmount: appointment.pricing?.chargedAmount ?? null,
      alreadyCompleted: true,
    };
  }

  const currency = appointment.pricing?.currency ?? "RSD";
  const by = input.actor.adminTenantUserId ?? null;

  const agreed =
    typeof input.amounts?.agreedPrice === "number" &&
    Number.isFinite(input.amounts.agreedPrice) &&
    input.amounts.agreedPrice >= 0
      ? Math.round(input.amounts.agreedPrice)
      : null;

  // 1. Dogovorena cena PRE pogodnosti.
  let pricing: IAppointmentPricing | null = appointment.pricing ?? null;
  if (agreed != null) {
    pricing = applyQuotedTotal(
      pricing ?? emptyPricingSnapshot(currency),
      agreed,
      by,
    );
  }

  // 2. Popust se računa nad tom cenom, na serveru.
  const plan = await planBenefitRecompute({
    appliedVoucherId: appointment.appliedVoucherId,
    pricing,
    services: appointment.services,
  });
  const benefit = plan.set ?? null;

  // Pogodnost koja OSTAJE na terminu ne sme da se obračuna nad neodgovorenom
  // cenom. Ako je vaučer u istom koraku otpao (`released`), potvrda cene se ne
  // traži — nema šta da se obračuna.
  if (
    plan.kind === "recomputed" &&
    needsAgreedPriceForCompletion({
      hasBenefit: true,
      pricing: appointment.pricing,
      agreedPrice: agreed,
    })
  ) {
    throw new LoyaltyRedemptionError(
      "INVALID",
      "Termin ima pogodnost, a cena pre pogodnosti nije potvrđena. Unesite ukupnu dogovorenu cenu.",
    );
  }

  // 3. Stvarno naplaćeno. Bez unosa se NE izmišlja: termin bez cene ostaje bez
  //    cene i ulazi u „Termini bez cene", ne u prihod.
  const chargedInput =
    typeof input.amounts?.chargedAmount === "number" &&
    Number.isFinite(input.amounts.chargedAmount) &&
    input.amounts.chargedAmount >= 0
      ? Math.round(input.amounts.chargedAmount)
      : null;
  if (chargedInput != null) {
    pricing = applyChargedAmount(
      pricing ?? emptyPricingSnapshot(currency),
      chargedInput,
      by,
    );
  }

  const benefitUnset = plan.kind === "released" ? BENEFIT_CLEAR_UNSET : undefined;

  // 4. Atomic prelaz: uslov na status je ograda protiv dvostruke obrade.
  const statusGuard = input.expectedFromStatus
    ? { status: input.expectedFromStatus }
    : { status: { $ne: "completed" } };

  // Upis statusa i oslobađanje otpale pogodnosti su ista transakcija.
  const updated = await commitBenefitRecompute(plan, (session) =>
    Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        tenantId: appointment.tenantId,
        ...statusGuard,
      },
      {
        $set: {
          status: "completed",
          ...(pricing ? { pricing } : {}),
          ...(benefit ?? {}),
        },
        ...(benefitUnset ? { $unset: benefitUnset } : {}),
      },
      { new: true, ...(session ? { session } : {}) },
    ).lean<CheckoutAppointment>(),
  );

  if (!updated) {
    throw new LoyaltyRedemptionError(
      "CONFLICT",
      "Termin je u međuvremenu promenjen. Osvežite listu.",
    );
  }

  // 5. Durable finalizacija: vaučer `reserved → redeemed` + `appointment_completed`
  //    događaj, pa TEK ONDA `loyaltyProcessed.completed`. Neuspeh ostavlja
  //    termin završenim ali nefinalizovanim, i sledeći poziv ga popravlja —
  //    nikad tiho izgubljenu zaradu.
  try {
    await finalizeAppointmentCompletion(appointment._id, {
      source: input.source ?? "admin",
    });
  } catch (err) {
    // Termin JESTE završen; loyalty ne sme da sruši taj ishod. Stanje je
    // popravljivo ponovnim checkout-om nad istim terminom.
    console.error("[checkout] loyalty finalization incomplete:", err);
  }

  return {
    appointmentId: String(appointment._id),
    status: "completed",
    pricing: updated.pricing ?? null,
    discountAmount: updated.discountAmount ?? null,
    finalPrice: updated.finalPrice ?? null,
    chargedAmount: updated.pricing?.chargedAmount ?? null,
    alreadyCompleted: false,
  };
}
