import "server-only";

/**
 * T1-4 — Loyalty Redemption: JEDAN server autoritet za pogodnost na terminu.
 *
 * Klijentski panel i admin panel rade istu radnju kroz iste funkcije. React
 * samo prikazuje DTO i šalje ID izbora: ne računa popust, ne proverava saldo i
 * ne odlučuje da li nagrada važi. Sve to bi u browseru bilo samo predlog.
 *
 * TVRDA PRAVILA koja ovaj modul čuva:
 *
 *   JEDNA POGODNOST PO TERMINU. Pošto i points-shop nagrada postaje Voucher,
 *   invariant se svodi na `Appointment.appliedVoucherId` = najviše jedan.
 *   Nema stackovanja i nema tenant podešavanja koje bi ga dozvolilo.
 *
 *   POENI SE TROŠE SAMO KROZ KONFIGURISANU PONUDU. Nema slobodnog unosa,
 *   nema kursa poen→RSD, nema slidera. Cena i nagrada se UVEK ponovo čitaju
 *   iz tenant konfiguracije po stabilnom `offerId`; browser šalje samo id.
 *
 *   SRCA SE NE TROŠE RUČNO. Ona su punch-card napredak i troši ih milestone
 *   pravilo u engine-u. Ovde ih nema.
 *
 *   BALANS NIKAD NIJE NEGATIVAN. Skidanje poena je USLOVNI `$inc` unutar
 *   transakcije (`pointsBalance >= costPoints`), pa dva paralelna zahteva ne
 *   mogu potrošiti isti saldo ni kada oba prođu istu proveru.
 */

import { Types, type ClientSession } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import { isLoyaltyActive } from "./events";
import { insertLedgerEntry, isDuplicateLedgerKey } from "./ledger";
import { LoyaltyRedemptionError } from "./errors";
import { runLoyaltyTransaction } from "./transaction";
import { describeReward } from "./descriptions";
import {
  computeBenefitPricing,
  evaluatePointsShopOffer,
  formatCurrencyAmount,
  generateVoucherCode,
  isVoucherApplicableToService,
  pointsShopIdempotencyKey,
  VOUCHER_PREFIX_BY_ORIGIN,
  type BenefitPricing,
} from "@/lib/platform/loyalty-client";
import { getAppointmentPreBenefitBasis } from "@/lib/appointments/pricingSnapshot";
import type { IAppointmentPricing } from "@/types";
import type { LoyaltyConfigLean, RewardSpec, VoucherType } from "./types";

// ─── Ko dela ──────────────────────────────────────────────────────────────────

/**
 * Pozivalac je uvek razrešen iz tokena, nikad iz tela zahteva.
 *
 * `client` sme samo svoj termin i svoj saldo; `admin` dela u ime klijentkinje
 * nad terminima svog salona (salon je već odobrio nagradu time što ju je
 * konfigurisao — dodatni approval lifecycle ne postoji).
 */
export type RedemptionActor =
  | { kind: "client"; tenantId: string; tenantUserId: string }
  | { kind: "admin"; tenantId: string; adminTenantUserId?: string | null };

/**
 * Minimalan oblik termina koji obračun pogodnosti stvarno čita.
 *
 * Namerno tolerantan prema id-jevima: pozivaoci su i `lean()` objekti
 * (ObjectId), i mongoose dokumenti, i DTO-i iz drugih slojeva (string). Uži
 * tip bi terao svaku putanju na svoj cast.
 */
export interface BenefitPricedAppointment {
  pricing?: IAppointmentPricing | null;
  services?: ReadonlyArray<{
    serviceId?: unknown;
    price?: number | null;
    quantity?: number | null;
  }>;
}

/** Id iz baze, dokumenta ili DTO-a — sve se svodi na string. */
type MaybeId = { toString(): string } | string | null | undefined;

function idToString(value: MaybeId): string | null {
  if (value == null) return null;
  const text = String(value);
  return text.length > 0 ? text : null;
}

interface AppointmentScopeLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  clientProfileId?: Types.ObjectId;
  status: string;
  serviceName?: string;
  services?: Array<{ serviceId?: Types.ObjectId; price?: number; quantity?: number }>;
  pricing?: IAppointmentPricing | null;
  appliedVoucherId?: Types.ObjectId | null;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
}

const APPOINTMENT_FIELDS =
  "tenantId clientProfileId status serviceName services pricing appliedVoucherId originalPrice discountAmount finalPrice";

/** Termini na kojima pogodnost više nema smisla: već su zatvoreni. */
const CLOSED_STATUSES = new Set([
  "completed",
  "no_show",
  "appointment_cancelled",
  "appointment_rejected",
]);

function scopeFilter(actor: RedemptionActor): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(actor.tenantId),
  };
  if (actor.kind === "client") {
    filter.clientProfileId = new Types.ObjectId(actor.tenantUserId);
  }
  return filter;
}

async function loadAppointment(
  appointmentId: string,
  actor: RedemptionActor,
  session?: ClientSession,
): Promise<AppointmentScopeLean> {
  if (!Types.ObjectId.isValid(appointmentId)) {
    throw new LoyaltyRedemptionError("NOT_FOUND", "Termin nije pronađen.");
  }
  const query = Appointment.findOne({
    _id: new Types.ObjectId(appointmentId),
    ...scopeFilter(actor),
  }).select(APPOINTMENT_FIELDS);
  if (session) query.session(session);
  const appointment = await query.lean<AppointmentScopeLean>();
  // Tuđi termin i nepostojeći termin daju ISTI odgovor: postojanje termina
  // drugog salona ili druge klijentkinje nije informacija koja se odaje.
  if (!appointment) {
    throw new LoyaltyRedemptionError("NOT_FOUND", "Termin nije pronađen.");
  }
  return appointment;
}

/** Klijentkinja čiji je termin — vlasnik naloga sa kog se troše poeni. */
function appointmentClientId(appointment: AppointmentScopeLean): Types.ObjectId {
  if (!appointment.clientProfileId) {
    throw new LoyaltyRedemptionError(
      "INVALID",
      "Termin nije vezan za nalog klijenta, pa pogodnost nije moguća.",
    );
  }
  return appointment.clientProfileId;
}

function appointmentServiceId(
  appointment: AppointmentScopeLean,
): Types.ObjectId | null {
  return appointment.services?.[0]?.serviceId ?? null;
}

function assertOpenForBenefit(appointment: AppointmentScopeLean): void {
  if (CLOSED_STATUSES.has(appointment.status)) {
    throw new LoyaltyRedemptionError(
      "INVALID",
      "Termin je zatvoren — pogodnost se više ne može menjati.",
    );
  }
}

/**
 * Filter koji uz vlasništvo traži i da je termin JOŠ UVEK otvoren.
 *
 * Provera pre transakcije nije dovoljna: termin sme da bude završen između
 * čitanja i upisa. Uslov mora da bude deo samog upisa, inače bi se pogodnost
 * menjala na već zatvorenom terminu.
 */
function openAppointmentFilter(actor: RedemptionActor): Record<string, unknown> {
  return {
    ...scopeFilter(actor),
    status: { $nin: [...CLOSED_STATUSES] },
  };
}

/**
 * Trenutna tenant konfiguracija, pročitana U TRANSAKCIJI.
 *
 * Cena i nagrada ponude su mutable podaci: vlasnica sme da ih promeni dok je
 * zahtev u letu. Ako bi kupovina koristila konfiguraciju učitanu pre
 * transakcije, prodala bi staru ponudu po staroj ceni — zato se ovde čita
 * ponovo, u istoj sesiji u kojoj se skidaju poeni.
 */
async function loadConfigInSession(
  tenantId: Types.ObjectId,
  session: ClientSession,
): Promise<LoyaltyConfigLean> {
  const config = await LoyaltyConfig.findOne({ tenantId })
    .session(session)
    .lean<LoyaltyConfigLean>();
  if (!config?.enabled) {
    throw new LoyaltyRedemptionError(
      "FORBIDDEN",
      "Program nagrađivanja trenutno nije aktivan.",
    );
  }
  return config;
}

// ─── Pricing pogodnosti — jedan helper za sve ulaze ───────────────────────────

export interface BenefitVoucherTerms {
  type: VoucherType;
  value: number;
  serviceScope?: Array<Types.ObjectId | string> | null;
  serviceName?: string;
}

/**
 * Canonical obračun pogodnosti nad terminom.
 *
 * Jedini računar popusta u aplikaciji: koriste ga booking create, naknadna
 * primena vaučera, points-shop kupovina, recompute posle quote-a i recompute
 * posle promene usluge. Bez ovoga bi svaka putanja imala svoju verziju
 * pravila „0 nije null".
 */
export function computeAppointmentBenefitPricing(input: {
  appointment: BenefitPricedAppointment;
  voucher: BenefitVoucherTerms | null;
}): BenefitPricing {
  const basis = getAppointmentPreBenefitBasis({
    pricing: input.appointment.pricing ?? null,
    services: input.appointment.services,
  });
  return computeBenefitPricing({
    basis,
    serviceId: idToString(input.appointment.services?.[0]?.serviceId as MaybeId),
    voucher: input.voucher
      ? {
          type: input.voucher.type,
          value: input.voucher.value,
          serviceScope: (input.voucher.serviceScope ?? []).map(String),
          serviceName: input.voucher.serviceName,
        }
      : null,
  });
}

/** Da li vaučer sme da stoji na OVOM terminu (scope usluge). */
export function isVoucherApplicableToAppointment(
  voucher: BenefitVoucherTerms,
  appointment: BenefitPricedAppointment,
): boolean {
  return isVoucherApplicableToService(
    { serviceScope: (voucher.serviceScope ?? []).map(String) },
    idToString(appointment.services?.[0]?.serviceId as MaybeId),
  );
}

// ─── Voucher čitanje ──────────────────────────────────────────────────────────

interface VoucherLeanFull {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  code: string;
  type: VoucherType;
  value: number;
  serviceScope: Types.ObjectId[];
  serviceName?: string;
  origin: string;
  ownerTenantUserId: Types.ObjectId | null;
  status: string;
  reservedAppointmentId?: Types.ObjectId | null;
  expiresAt?: Date | null;
}

const VOUCHER_FIELDS =
  "tenantId code type value serviceScope serviceName origin ownerTenantUserId status reservedAppointmentId expiresAt";

function voucherIsUsable(voucher: VoucherLeanFull, now: Date): boolean {
  if (voucher.status !== "active") return false;
  if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

// ─── DTO za prikaz ────────────────────────────────────────────────────────────

export interface AvailableVoucherBenefit {
  kind: "voucher";
  voucherId: string;
  code: string;
  label: string;
  origin: string;
  expiresAt: string | null;
  /** Popust nad TRENUTNOM osnovicom; `null` dok cena nije poznata. */
  previewDiscount: number | null;
}

export interface AvailablePointsOffer {
  kind: "points_shop";
  offerId: string;
  costPoints: number;
  costLabel: string;
  label: string;
  affordable: boolean;
  applicable: boolean;
  eligible: boolean;
  missingPoints: number;
  previewDiscount: number | null;
}

export interface AppliedBenefitView {
  voucherId: string;
  code: string;
  label: string;
  origin: string;
  originalPrice: number | null;
  discountAmount: number | null;
  finalPrice: number | null;
}

export interface AvailableBenefits {
  /** Program radi (capability + plan + salon uključio + config.enabled). */
  enabled: boolean;
  pointsEnabled: boolean;
  pointsBalance: number;
  pointsEmoji: string;
  /** Termin je zatvoren ili nema klijenta — picker se ne nudi. */
  editable: boolean;
  applied: AppliedBenefitView | null;
  vouchers: AvailableVoucherBenefit[];
  offers: AvailablePointsOffer[];
  /** Ima li išta što bi korisnica MOGLA da primeni sada. */
  hasUsable: boolean;
}

const EMPTY_BENEFITS: AvailableBenefits = {
  enabled: false,
  pointsEnabled: false,
  pointsBalance: 0,
  pointsEmoji: "⭐",
  editable: false,
  applied: null,
  vouchers: [],
  offers: [],
  hasUsable: false,
};

function voucherLabel(voucher: {
  type: VoucherType;
  value: number;
  serviceName?: string;
}): string {
  return describeReward(voucher);
}

/** Ponude sa stabilnim id-jem; stavka bez id-a se NE nudi za kupovinu. */
function usableOffers(
  config: LoyaltyConfigLean,
): Array<{ id: string; costPoints: number; reward: RewardSpec }> {
  return (config.pointsShop ?? []).flatMap((offer) => {
    const id = (offer as { id?: string }).id;
    if (!id || !offer.reward) return [];
    return [{ id, costPoints: offer.costPoints, reward: offer.reward }];
  });
}

/**
 * Sve što jedan termin sme da ponudi — server sam učita svaki uslov.
 *
 * Nikad ne baca zbog isključenog programa: salon bez loyalty-ja jednostavno
 * nema šta da ponudi, i to nije greška nego prazan odgovor.
 */
export async function listAvailableBenefits(input: {
  appointmentId: string;
  actor: RedemptionActor;
}): Promise<AvailableBenefits> {
  await connectToDB();
  const appointment = await loadAppointment(input.appointmentId, input.actor);
  const { active, config } = await isLoyaltyActive(input.actor.tenantId);

  const clientId = appointment.clientProfileId;
  if (!active || !config || !clientId) return EMPTY_BENEFITS;

  const now = new Date();
  const [account, vouchers, appliedVoucher] = await Promise.all([
    LoyaltyAccount.findOne({
      tenantId: appointment.tenantId,
      tenantUserId: clientId,
    })
      .select("pointsBalance")
      .lean<{ pointsBalance?: number }>(),
    Voucher.find({
      tenantId: appointment.tenantId,
      ownerTenantUserId: clientId,
      status: "active",
    })
      .select(VOUCHER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<VoucherLeanFull[]>(),
    appointment.appliedVoucherId
      ? Voucher.findById(appointment.appliedVoucherId)
          .select(VOUCHER_FIELDS)
          .lean<VoucherLeanFull>()
      : Promise.resolve(null),
  ]);

  const pointsBalance = account?.pointsBalance ?? 0;
  const pointsEnabled = Boolean(config.currencies.points.enabled);
  const serviceId = appointmentServiceId(appointment);
  const editable = !CLOSED_STATUSES.has(appointment.status);

  const applied: AppliedBenefitView | null = appliedVoucher
    ? {
        voucherId: String(appliedVoucher._id),
        code: appliedVoucher.code,
        label: voucherLabel(appliedVoucher),
        origin: appliedVoucher.origin,
        originalPrice: appointment.originalPrice ?? null,
        discountAmount: appointment.discountAmount ?? null,
        finalPrice: appointment.finalPrice ?? null,
      }
    : null;

  // Već postoji pogodnost → picker ne nudi drugu. Zamena ide kroz eksplicitno
  // uklanjanje, da stackovanje ne bude moguće ni previdom u UI-ju.
  if (applied || !editable) {
    return {
      enabled: true,
      pointsEnabled,
      pointsBalance,
      pointsEmoji: config.currencies.points.emoji || "⭐",
      editable,
      applied,
      vouchers: [],
      offers: [],
      hasUsable: false,
    };
  }

  const voucherOptions: AvailableVoucherBenefit[] = vouchers
    .filter((voucher) => voucherIsUsable(voucher, now))
    .filter((voucher) => isVoucherApplicableToAppointment(voucher, appointment))
    .map((voucher) => ({
      kind: "voucher" as const,
      voucherId: String(voucher._id),
      code: voucher.code,
      label: voucherLabel(voucher),
      origin: voucher.origin,
      expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt).toISOString() : null,
      previewDiscount: computeAppointmentBenefitPricing({
        appointment,
        voucher,
      }).discountAmount,
    }));

  const offerOptions: AvailablePointsOffer[] = pointsEnabled
    ? usableOffers(config).map((offer) => {
        const eligibility = evaluatePointsShopOffer({
          offer,
          pointsBalance,
          serviceId: serviceId ? String(serviceId) : null,
        });
        return {
          kind: "points_shop" as const,
          offerId: offer.id,
          costPoints: offer.costPoints,
          costLabel: `${formatCurrencyAmount(offer.costPoints, config.currencies.points)} ${config.currencies.points.emoji}`,
          label: describeReward(offer.reward),
          affordable: eligibility.affordable,
          applicable: eligibility.applicable,
          eligible: eligibility.eligible,
          missingPoints: eligibility.missingPoints,
          previewDiscount: computeAppointmentBenefitPricing({
            appointment,
            voucher: {
              type: offer.reward.type,
              value: offer.reward.value,
              serviceScope: offer.reward.serviceId ? [offer.reward.serviceId] : [],
              serviceName: offer.reward.serviceName,
            },
          }).discountAmount,
        };
      })
    : [];

  return {
    enabled: true,
    pointsEnabled,
    pointsBalance,
    pointsEmoji: config.currencies.points.emoji || "⭐",
    editable,
    applied: null,
    vouchers: voucherOptions,
    offers: offerOptions,
    hasUsable:
      voucherOptions.length > 0 || offerOptions.some((offer) => offer.eligible),
  };
}

// ─── Primena postojećeg vaučera na POSTOJEĆI termin ───────────────────────────

export interface BenefitApplied {
  voucherId: string;
  code: string;
  label: string;
  origin: string;
  pricing: BenefitPricing;
  /** Retry koji je zatekao isto stanje — nije nova kupovina. */
  idempotentReplay: boolean;
}

/**
 * ACTIVE vaučer → postojeći termin → RESERVED.
 *
 * Postojeći `reserveVoucherForBooking` radi po KODU i u trenutku zakazivanja;
 * ovde vaučer bira sama korisnica iz svog novčanika, po id-ju, na već
 * zakazanom terminu. CAS uslov (`status: "active"`) rešava trku: od dva
 * paralelna pokušaja istim vaučerom prolazi tačno jedan.
 */
export async function applyExistingVoucher(input: {
  appointmentId: string;
  voucherId: string;
  actor: RedemptionActor;
}): Promise<BenefitApplied> {
  await connectToDB();
  if (!Types.ObjectId.isValid(input.voucherId)) {
    throw new LoyaltyRedemptionError("NOT_FOUND", "Vaučer nije pronađen.");
  }

  // Pre transakcije samo plan/capability — sve ostalo je mutable i čita se
  // ponovo u sesiji.
  const preview = await loadAppointment(input.appointmentId, input.actor);
  assertOpenForBenefit(preview);
  const { active } = await isLoyaltyActive(input.actor.tenantId);
  if (!active) {
    throw new LoyaltyRedemptionError(
      "FORBIDDEN",
      "Program nagrađivanja trenutno nije aktivan.",
    );
  }

  return runLoyaltyTransaction(async (session) => {
    // Termin: ponovo, u sesiji, u opsegu pozivaoca.
    const appointment = await loadAppointment(
      input.appointmentId,
      input.actor,
      session,
    );
    assertOpenForBenefit(appointment);
    const clientId = appointmentClientId(appointment);

    // Vaučer: ponovo, u sesiji — vlasništvo, status, rok i scope se od
    // prvog čitanja mogu promeniti.
    const voucher = await Voucher.findOne({
      _id: new Types.ObjectId(input.voucherId),
      tenantId: appointment.tenantId,
      ownerTenantUserId: clientId,
    })
      .select(VOUCHER_FIELDS)
      .session(session)
      .lean<VoucherLeanFull>();
    if (!voucher) {
      throw new LoyaltyRedemptionError("NOT_FOUND", "Vaučer nije pronađen.");
    }

    // Retry: vaučer je već na ovom terminu.
    if (
      voucher.status === "reserved" &&
      String(voucher.reservedAppointmentId) === String(appointment._id) &&
      String(appointment.appliedVoucherId) === String(voucher._id)
    ) {
      return {
        voucherId: String(voucher._id),
        code: voucher.code,
        label: voucherLabel(voucher),
        origin: voucher.origin,
        pricing: {
          originalPrice: appointment.originalPrice ?? null,
          discountAmount: appointment.discountAmount ?? null,
          finalPrice: appointment.finalPrice ?? null,
        },
        idempotentReplay: true,
      };
    }

    if (appointment.appliedVoucherId) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Termin već ima pogodnost. Uklonite postojeću pa dodajte drugu.",
      );
    }
    if (!voucherIsUsable(voucher, new Date())) {
      throw new LoyaltyRedemptionError(
        "INVALID",
        "Vaučer nije važeći ili je već iskorišćen.",
      );
    }
    // Scope se proverava nad uslugom OVOG, transakcionog termina.
    if (!isVoucherApplicableToAppointment(voucher, appointment)) {
      throw new LoyaltyRedemptionError(
        "INVALID",
        "Vaučer ne važi za izabranu uslugu.",
      );
    }

    const pricing = computeAppointmentBenefitPricing({ appointment, voucher });

    const reserved = await Voucher.findOneAndUpdate(
      { _id: voucher._id, status: "active" },
      { $set: { status: "reserved", reservedAppointmentId: appointment._id } },
      { new: true, session },
    ).lean<VoucherLeanFull>();
    if (!reserved) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Vaučer je upravo iskorišćen na drugom mestu.",
      );
    }

    const updated = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        ...openAppointmentFilter(input.actor),
        appliedVoucherId: { $in: [null, undefined] },
      },
      { $set: { appliedVoucherId: reserved._id, ...pricing } },
      { new: true, session },
    ).lean<AppointmentScopeLean>();
    if (!updated) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Termin je u međuvremenu promenjen. Osvežite i pokušajte ponovo.",
      );
    }

    return {
      voucherId: String(reserved._id),
      code: reserved.code,
      label: voucherLabel(reserved),
      origin: reserved.origin,
      pricing,
      idempotentReplay: false,
    };
  });
}

// ─── Points-shop kupovina ─────────────────────────────────────────────────────

/**
 * Poeni → vaučer → rezervacija na terminu, sve u JEDNOJ transakciji.
 *
 * Redosled unutar transakcije je namerno ovakav:
 *
 *   1. ledger unos PRVI — unique {tenantId, idempotencyKey} je ograda protiv
 *      dvostruke naplate; da je posle skidanja poena, retry bi prvo skinuo
 *      poene pa tek onda otkrio da je duplikat;
 *   2. USLOVNO skidanje poena (`pointsBalance >= costPoints`) — jedina
 *      garancija da paralelni zahtevi ne potroše isti saldo i da balans ne
 *      može pasti ispod nule;
 *   3. vaučer sa snapshotom uslova;
 *   4. upis na termin pod uslovom da pogodnost i dalje ne postoji.
 *
 * Bilo koji neuspeh ruši celu transakciju: ne postoji stanje „poeni skinuti,
 * vaučera nema" ni obrnuto.
 */
export async function redeemPointsReward(input: {
  appointmentId: string;
  offerId: string;
  actor: RedemptionActor;
}): Promise<BenefitApplied> {
  await connectToDB();

  // Pre transakcije se rešava SAMO ono što ne može da se promeni pod nogama:
  // plan/capability (`tenantHasFeature`) i pitanje da li je ova kupovina već
  // naplaćena. Sve mutable poslovne činjenice — termin, ponuda, cena, usluga —
  // čitaju se ponovo UNUTAR transakcije.
  const preview = await loadAppointment(input.appointmentId, input.actor);
  assertOpenForBenefit(preview);
  const { active } = await isLoyaltyActive(input.actor.tenantId);
  if (!active) {
    throw new LoyaltyRedemptionError(
      "FORBIDDEN",
      "Program nagrađivanja trenutno nije aktivan.",
    );
  }

  const idempotencyKey = pointsShopIdempotencyKey(input.appointmentId, input.offerId);

  // Retry posle uspešne kupovine mora da vrati postojeće stanje, ne grešku:
  // poeni su već naplaćeni i drugi put se ne naplaćuju.
  const existingEntry = await LoyaltyLedger.findOne({
    tenantId: preview.tenantId,
    idempotencyKey,
  })
    .select("source")
    .lean<{ source?: { voucherId?: Types.ObjectId } }>();
  if (existingEntry?.source?.voucherId) {
    const existingVoucher = await Voucher.findById(existingEntry.source.voucherId)
      .select(VOUCHER_FIELDS)
      .lean<VoucherLeanFull>();
    if (existingVoucher) {
      return {
        voucherId: String(existingVoucher._id),
        code: existingVoucher.code,
        label: voucherLabel(existingVoucher),
        origin: existingVoucher.origin,
        pricing: {
          originalPrice: preview.originalPrice ?? null,
          discountAmount: preview.discountAmount ?? null,
          finalPrice: preview.finalPrice ?? null,
        },
        idempotentReplay: true,
      };
    }
  }

  return runLoyaltyTransaction(async (session) => {
    // 1. Termin se čita PONOVO, u sesiji i u opsegu pozivaoca.
    const appointment = await loadAppointment(
      input.appointmentId,
      input.actor,
      session,
    );
    // 2. i 3. Još uvek otvoren i još uvek bez pogodnosti.
    assertOpenForBenefit(appointment);
    if (appointment.appliedVoucherId) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Termin već ima pogodnost. Uklonite postojeću pa dodajte drugu.",
      );
    }
    const clientId = appointmentClientId(appointment);
    // 4. Usluga dolazi iz OVOG, transakcionog termina — ne iz onog pročitanog
    //    pre transakcije, koji je u međuvremenu mogao biti promenjen.
    const serviceId = appointmentServiceId(appointment);

    // 5. i 6. Trenutna konfiguracija i trenutna ponuda po stabilnom id-ju.
    const config = await loadConfigInSession(appointment.tenantId, session);
    if (!config.currencies.points.enabled) {
      throw new LoyaltyRedemptionError(
        "FORBIDDEN",
        "Poeni nisu uključeni u ovom salonu.",
      );
    }
    const offer = usableOffers(config).find((item) => item.id === input.offerId);
    if (!offer) {
      throw new LoyaltyRedemptionError("INVALID", "Nagrada više nije dostupna.");
    }

    // 7. Primenljivost se proverava nad TRENUTNOM uslugom i TRENUTNOM ponudom.
    const eligibility = evaluatePointsShopOffer({
      offer,
      pointsBalance: 0,
      serviceId: serviceId ? String(serviceId) : null,
    });
    if (!eligibility.applicable) {
      throw new LoyaltyRedemptionError(
        "INVALID",
        "Nagrada ne važi za izabranu uslugu.",
      );
    }

    const voucherTerms: BenefitVoucherTerms = {
      type: offer.reward.type,
      value: offer.reward.value,
      serviceScope: offer.reward.serviceId ? [String(offer.reward.serviceId)] : [],
      serviceName: offer.reward.serviceName,
    };
    const pricing = computeAppointmentBenefitPricing({
      appointment,
      voucher: voucherTerms,
    });
    const expiresDays = offer.reward.expiresDays || 90;
    const rewardLabel = describeReward(offer.reward);
    const voucherCode = generateVoucherCode(VOUCHER_PREFIX_BY_ORIGIN.points_shop);

    // 8. Nalog mora postojati pre uslovnog skidanja; `upsert` u sesiji je
    //    bezbedan jer je jedinstven po {tenantId, tenantUserId}.
    const account = await LoyaltyAccount.findOneAndUpdate(
      { tenantId: appointment.tenantId, tenantUserId: clientId },
      { $setOnInsert: { tenantId: appointment.tenantId, tenantUserId: clientId } },
      { new: true, upsert: true, session },
    ).lean<{ _id: Types.ObjectId }>();
    if (!account) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Loyalty nalog nije dostupan. Pokušajte ponovo.",
      );
    }

    const voucherId = new Types.ObjectId();

    // Idempotency ograda PRE naplate: da je posle skidanja, retry bi prvo
    // skinuo poene pa tek onda otkrio da je duplikat.
    try {
      await insertLedgerEntry(
        {
          tenantId: appointment.tenantId,
          accountId: account._id,
          tenantUserId: clientId,
          entryType: "redeem",
          currency: "points",
          amount: -offer.costPoints,
          source: {
            appointmentId: appointment._id,
            voucherId,
            ruleId: `points_shop:${offer.id}`,
            ...(input.actor.kind === "admin" && input.actor.adminTenantUserId
              ? { adminUserId: input.actor.adminTenantUserId }
              : {}),
          },
          idempotencyKey,
          description: `Nagrada — ${rewardLabel}`,
        },
        session,
      );
    } catch (err) {
      if (isDuplicateLedgerKey(err)) {
        throw new LoyaltyRedemptionError(
          "CONFLICT",
          "Nagrada je već preuzeta za ovaj termin.",
        );
      }
      throw err;
    }

    // Uslovno skidanje: jedini trenutak u kojem saldo može pasti.
    const debited = await LoyaltyAccount.findOneAndUpdate(
      { _id: account._id, pointsBalance: { $gte: offer.costPoints } },
      { $inc: { pointsBalance: -offer.costPoints } },
      { new: true, session },
    ).lean<{ pointsBalance: number }>();
    if (!debited) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        `Nemate dovoljno poena za ovu nagradu (potrebno ${formatCurrencyAmount(offer.costPoints, config.currencies.points)}).`,
      );
    }

    // Vaučer sa snapshotom uslova koji su važili U TRENUTKU kupovine.
    await Voucher.create(
      [
        {
          _id: voucherId,
          tenantId: appointment.tenantId,
          code: voucherCode,
          type: offer.reward.type,
          value: offer.reward.value,
          serviceScope: offer.reward.serviceId ? [offer.reward.serviceId] : [],
          serviceName: offer.reward.serviceName ?? "",
          origin: "points_shop",
          ownerTenantUserId: clientId,
          status: "reserved",
          reservedAppointmentId: appointment._id,
          expiresAt: new Date(Date.now() + expiresDays * 24 * 3_600_000),
          issuedByRuleId: `points_shop:${offer.id}`,
          issuedForAppointmentId: appointment._id,
          ...(input.actor.kind === "admin" && input.actor.adminTenantUserId
            ? { issuedByAdminId: input.actor.adminTenantUserId }
            : {}),
          pointsShopSnapshot: {
            offerId: offer.id,
            costPoints: offer.costPoints,
            rewardType: offer.reward.type,
            rewardValue: offer.reward.value,
            serviceId: offer.reward.serviceId ?? null,
            serviceName: offer.reward.serviceName ?? "",
            expiresDays,
            redeemedForAppointmentId: appointment._id,
          },
        },
      ],
      { session },
    );

    // Jedna pogodnost po terminu I dalje otvoren termin — oba uslova su deo
    // upisa, ne provera pre njega.
    const updated = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        ...openAppointmentFilter(input.actor),
        appliedVoucherId: { $in: [null, undefined] },
      },
      { $set: { appliedVoucherId: voucherId, ...pricing } },
      { new: true, session },
    ).lean<AppointmentScopeLean>();
    if (!updated) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Termin je u međuvremenu promenjen. Osvežite i pokušajte ponovo.",
      );
    }

    return {
      voucherId: String(voucherId),
      code: voucherCode,
      label: rewardLabel,
      origin: "points_shop",
      pricing,
      idempotentReplay: false,
    };
  });
}

// ─── Uklanjanje pogodnosti ────────────────────────────────────────────────────

export interface BenefitRemoved {
  removed: boolean;
  voucherId: string | null;
  /** Points-shop poeni se NE vraćaju — vidi komentar ispod. */
  pointsRefunded: false;
}

/**
 * Skidanje pogodnosti sa termina: vaučer se vraća u novčanik (`active`).
 *
 * Poeni se NIKAD ne refundiraju. Klijentkinja ih je zamenila za stvarnu
 * vrednost — vaučer koji i dalje poseduje i sme da primeni na drugi termin.
 * Refund bi značio da isti poeni postoje dvaput: i kao saldo i kao vaučer.
 */
export async function removeBenefit(input: {
  appointmentId: string;
  actor: RedemptionActor;
}): Promise<BenefitRemoved> {
  await connectToDB();
  const preview = await loadAppointment(input.appointmentId, input.actor);
  assertOpenForBenefit(preview);
  if (!preview.appliedVoucherId) {
    return { removed: false, voucherId: null, pointsRefunded: false };
  }

  return runLoyaltyTransaction(async (session) => {
    // Termin se čita ponovo: paralelan završetak mora da SPREČI uklanjanje
    // pogodnosti — inače bi vaučer nestao sa termina koji je već naplaćen.
    const appointment = await loadAppointment(
      input.appointmentId,
      input.actor,
      session,
    );
    assertOpenForBenefit(appointment);
    if (!appointment.appliedVoucherId) {
      return { removed: false, voucherId: null, pointsRefunded: false as const };
    }

    const cleared = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        ...openAppointmentFilter(input.actor),
        appliedVoucherId: appointment.appliedVoucherId,
      },
      { $unset: { ...BENEFIT_CLEAR_UNSET } },
      { new: true, session },
    ).lean<AppointmentScopeLean>();
    if (!cleared) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Termin je u međuvremenu promenjen. Osvežite i pokušajte ponovo.",
      );
    }

    // Ista transakcija: nema stanja u kojem termin nema pogodnost, a vaučer
    // je i dalje zaključan na njemu.
    await Voucher.findOneAndUpdate(
      { _id: appointment.appliedVoucherId, status: "reserved" },
      { $set: { status: "active", reservedAppointmentId: null } },
      { session },
    );

    return {
      removed: true,
      voucherId: String(appointment.appliedVoucherId),
      pointsRefunded: false as const,
    };
  });
}

// ─── Recompute posle promene cene ili usluge ──────────────────────────────────

export interface BenefitRecomputePlan {
  /** `none` = termin nema pogodnost, ništa se ne menja. */
  kind: "none" | "recomputed" | "released";
  /** Nova vrednost `originalPrice`/`discountAmount`/`finalPrice`. */
  set?: BenefitPricing;
  /** Vaučer koji treba vratiti u `active` (posle upisa termina). */
  releaseVoucherId?: Types.ObjectId;
}

/**
 * Šta se dešava sa pogodnošću kada se termin promeni.
 *
 * Zatvara dve zatečene rupe:
 *
 *   1. Vaučer na terminu „na upit" ostajao je sa `null` iznosima ZAUVEK.
 *      Kada salon kasnije potvrdi cenu (4.000), popust od 20% mora da postane
 *      800 RSD. Do sada nijedna putanja to nije radila, pa je vaučer bio
 *      rezervisan a nikad obračunat.
 *
 *   2. Promena usluge ostavljala je popust na POGREŠNOJ usluzi. Vaučer vezan
 *      za tretman lica ostajao bi na terminu prebačenom na manikir.
 *
 * Pomeranje datuma/vremena NIJE promena osnovice — pogodnost ostaje ista, a
 * `computeAppointmentBenefitPricing` nad nepromenjenom cenom vrati iste
 * brojeve, pa je upis bezopasan.
 *
 * Ulaz je PROJEKTOVANO stanje termina (posle primene izmene), ne sačuvano:
 * recompute mora da vidi novu cenu i novu uslugu, inače računa nad prošlošću.
 */
export async function planBenefitRecompute(
  projected: BenefitPricedAppointment & { appliedVoucherId?: MaybeId },
): Promise<BenefitRecomputePlan> {
  const voucherId = idToString(projected.appliedVoucherId);
  if (!voucherId || !Types.ObjectId.isValid(voucherId)) return { kind: "none" };
  await connectToDB();

  const voucher = await Voucher.findById(voucherId)
    .select(VOUCHER_FIELDS)
    .lean<VoucherLeanFull>();
  // Vaučer koji je nestao ne sme da zaključa termin u stanju „ima pogodnost".
  if (!voucher) {
    return {
      kind: "released",
      releaseVoucherId: undefined,
    };
  }

  const appointment: BenefitPricedAppointment = {
    pricing: projected.pricing,
    services: projected.services,
  };
  if (!isVoucherApplicableToAppointment(voucher, appointment)) {
    return { kind: "released", releaseVoucherId: voucher._id };
  }

  return {
    kind: "recomputed",
    set: computeAppointmentBenefitPricing({ appointment, voucher }),
  };
}

/** Polja koja se brišu kada pogodnost odlazi sa termina. */
export const BENEFIT_CLEAR_UNSET = {
  appliedVoucherId: 1,
  originalPrice: 1,
  discountAmount: 1,
  finalPrice: 1,
} as const;

/**
 * Upis termina i oslobađanje vaučera — ATOMSKI kad plan kaže `released`.
 *
 * Ranije su to bila dva odvojena poziva, s tim da je oslobađanje išlo POSLE
 * commit-a i gutalo grešku. Pad između njih ostavljao je stanje koje niko ne
 * bi primetio dok se klijentkinja ne požali:
 *
 *   Appointment:  pogodnost uklonjena
 *   Voucher:      i dalje `reserved` na tom terminu  ← zaključana vrednost
 *
 * Zato oba upisa idu u istu transakciju. `write` prima sesiju i mora je
 * proslediti svom upisu; kada nema šta da se oslobodi (`none` /
 * `recomputed`), transakcija se ne otvara — recompute je običan `$set` i ne
 * traži je.
 *
 * Poeni se NE refundiraju ni ovde: points-shop vaučer je i dalje kod
 * klijentkinje i sme da ode na drugi termin.
 */
export async function commitBenefitRecompute<T>(
  plan: BenefitRecomputePlan,
  write: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  if (plan.kind !== "released") return write(undefined);

  return runLoyaltyTransaction(async (session) => {
    const result = await write(session);
    if (plan.releaseVoucherId) {
      await Voucher.findOneAndUpdate(
        { _id: plan.releaseVoucherId, status: "reserved" },
        { $set: { status: "active", reservedAppointmentId: null } },
        { session },
      );
    }
    return result;
  });
}
